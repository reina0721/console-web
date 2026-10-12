import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  IdentityError,
  defaultUserQuery,
  type CreateUserInput,
  type UpdateUserInput,
} from '@community-go/surface/identity';
import { createMockIdentityService, type IdentityOperations } from '../identity/mock-service';
import { createBackendIdentityService } from '../identity/backend-service';
import {
  readMockDatabase,
  createDatabaseAuthRepository,
  MOCK_DATABASE_KEY,
} from '../identity/mock-database';
import { createMockAuthService } from '../auth/mock-adapter';
import { createBrowserMockRepository } from '../auth/mock-repository';
import { withMockDirectory } from '../identity/mock-auth';
import { createJsonClient } from '../api/json-client';

let owner = 'mock-demo';
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  owner = 'mock-demo';
  window.localStorage.removeItem(MOCK_DATABASE_KEY);
  await createDatabaseAuthRepository().saveSession({
    user: { id: owner, name: 'Rin', email: 'demo@community.test' },
    expiresAt: Date.now() + 60000,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.removeItem(MOCK_DATABASE_KEY);
});

function contractRequest(service: IdentityOperations): typeof fetch {
  return async (input, options) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      'https://example.test',
    );
    const path = url.pathname.replace(/^\/api/, '');
    const method = options?.method ?? 'GET';
    if (path === '/auth/csrf') return Response.json({ token: 'test-csrf' });
    if (method !== 'GET')
      expect(new Headers(options?.headers).get('X-CSRF-Token')).toBe('test-csrf');
    const body: unknown = typeof options?.body === 'string' ? JSON.parse(options.body) : undefined;
    try {
      if (path === '/auth/access') return Response.json(await service.access());
      if (path === '/roles') return Response.json({ items: await service.roles() });
      if (path === '/me' && method === 'GET') return Response.json({ user: await service.me() });
      if (path === '/me' && method === 'PATCH') {
        const { updateUserSchema } = await import('@community-go/surface/identity');
        return Response.json({ user: await service.updateMe(updateUserSchema.parse(body)) });
      }
      if (path === '/users' && method === 'GET') {
        const query = {
          ...defaultUserQuery,
          q: url.searchParams.get('q') ?? '',
          page: Number(url.searchParams.get('page')),
          pageSize: Number(url.searchParams.get('pageSize')),
        };
        const { userQuerySchema } = await import('@community-go/surface/identity');
        return Response.json(
          await service.list(
            userQuerySchema.parse({
              ...query,
              status: url.searchParams.get('status'),
              roleId: url.searchParams.get('roleId'),
              sort: url.searchParams.get('sort'),
              direction: url.searchParams.get('direction'),
            }),
          ),
        );
      }
      if (path === '/users' && method === 'POST') {
        const { createUserSchema } = await import('@community-go/surface/identity');
        return Response.json(
          { user: await service.create(createUserSchema.parse(body)) },
          { status: 201 },
        );
      }
      const match = /^\/users\/([^/]+)(?:\/(status|roles))?$/.exec(path);
      const id = match?.[1];
      if (id && method === 'GET')
        return Response.json({ user: await service.read(decodeURIComponent(id)) });
      if (id && method === 'PATCH') {
        const { z } = await import('zod');
        const { updateUserSchema, userStatusSchema, roleIdsSchema } =
          await import('@community-go/surface/identity');
        if (match[2] === 'status') {
          const values = z.object({ status: userStatusSchema, version: z.number() }).parse(body);
          return Response.json({
            user: await service.setStatus(id, values.version, values.status),
          });
        }
        if (match[2] === 'roles') {
          const values = z.object({ roleIds: roleIdsSchema, version: z.number() }).parse(body);
          return Response.json({
            user: await service.setRoles(id, values.version, values.roleIds),
          });
        }
        return Response.json({ user: await service.update(id, updateUserSchema.parse(body)) });
      }
      return new Response(null, { status: 404 });
    } catch (error) {
      if (!(error instanceof IdentityError)) throw error;
      const status =
        error.code === 'unauthenticated'
          ? 401
          : error.code === 'forbidden'
            ? 403
            : error.code === 'not-found'
              ? 404
              : error.code === 'conflict'
                ? 409
                : error.code === 'validation'
                  ? 422
                  : 503;
      return Response.json(
        {
          error: {
            code: error.code,
            ...(error.reason ? { reason: error.reason } : {}),
            fields: error.fields,
          },
        },
        { status },
      );
    }
  };
}
describe.each(['mock', 'backend'] as const)('%s identity contract', (mode) => {
  function service() {
    const mock = createMockIdentityService(() => owner);
    return mode === 'mock' ? mock : createBackendIdentityService('/api', contractRequest(mock));
  }
  it('closes query/create/read/edit/status/role/reload with one identity and preserved credentials', async () => {
    const api = service();
    const first = await api.list({ ...defaultUserQuery, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.total).toBe(24);
    const input: CreateUserInput = {
      name: 'New member',
      email: 'NEW@example.test',
      password: 'CreatedPassword2026!',
      status: 'active',
      roleIds: ['viewer'],
    };
    const created = await api.create(input);
    expect(created.email).toBe('new@example.test');
    expect(JSON.stringify(await readMockDatabase())).not.toContain(input.password);
    const searched = await api.list({ ...defaultUserQuery, q: 'new@example.test' });
    expect(searched.items.map((user) => user.id)).toEqual([created.id]);
    await expect(api.create(input)).rejects.toMatchObject({
      code: 'conflict',
      reason: 'duplicate-email',
    });
    const edited = await api.update(created.id, {
      name: 'Updated member',
      email: 'updated@example.test',
      version: created.version,
    });
    expect(await api.read(created.id)).toEqual(edited);
    await expect(
      api.update(created.id, { name: 'Stale', email: edited.email, version: created.version }),
    ).rejects.toMatchObject({ code: 'conflict', reason: 'stale-version' });
    const disabled = await api.setStatus(created.id, edited.version, 'disabled');
    expect(
      (await service().list({ ...defaultUserQuery, status: 'disabled', q: 'updated' })).items,
    ).toEqual([disabled]);
    const enabled = await api.setStatus(created.id, disabled.version, 'active');
    const assigned = await api.setRoles(created.id, enabled.version, ['operator', 'viewer']);
    expect((await service().read(created.id)).roleIds).toEqual(assigned.roleIds);
    const auth = withMockDirectory(createMockAuthService(createBrowserMockRepository()));
    await auth.logout();
    const session = await auth.login({ email: edited.email, password: input.password });
    expect(session.user.id).toBe(created.id);
  });
  it('protects self, validates role relationships and denies a restricted identity', async () => {
    const api = service();
    const self = await api.me();
    await expect(api.setStatus(self.id, self.version, 'disabled')).rejects.toMatchObject({
      code: 'conflict',
      reason: 'protected-user',
    });
    await expect(api.setRoles(self.id, self.version, ['viewer'])).rejects.toMatchObject({
      code: 'conflict',
      reason: 'protected-user',
    });
    const target = await api.read('member-001');
    await expect(api.setRoles(target.id, target.version, ['missing-role'])).rejects.toMatchObject({
      code: 'validation',
    });
    owner = 'mock-viewer';
    await createDatabaseAuthRepository().saveSession({
      user: { id: owner, name: 'Morgan Lee', email: 'viewer@community.test' },
      expiresAt: Date.now() + 60000,
    });
    await expect(api.list(defaultUserQuery)).rejects.toMatchObject({ code: 'forbidden' });
    const profile = await api.me();
    expect(profile.id).toBe(owner);
    expect((await api.access()).permissions).toEqual(['account.update']);
    const update: UpdateUserInput = {
      name: 'Morgan updated',
      email: profile.email,
      version: profile.version,
    };
    const changed = await api.updateMe(update);
    expect((await api.me()).name).toBe(changed.name);
    await expect(api.update(target.id, update)).rejects.toMatchObject({ code: 'forbidden' });
  });
});
it('migrates v1 accounts/session in place and preserves corrupt/unknown versions', async () => {
  const session = {
    user: { id: 'legacy-one', name: 'Legacy', email: 'legacy@example.test' },
    expiresAt: Date.now() + 60000,
  };
  window.localStorage.setItem(
    MOCK_DATABASE_KEY,
    JSON.stringify({
      version: 1,
      state: { accounts: [{ user: session.user, salt: 'salt', digest: 'a'.repeat(64) }], session },
    }),
  );
  const migrated = await readMockDatabase();
  expect(migrated.users.find((user) => user.id === session.user.id)).toMatchObject({
    ...session.user,
    roleIds: ['viewer'],
  });
  expect(migrated.accounts).toHaveLength(1);
  window.localStorage.setItem(MOCK_DATABASE_KEY, 'corrupt');
  await expect(readMockDatabase()).rejects.toMatchObject({ code: 'protocol' });
  expect(window.localStorage.getItem(MOCK_DATABASE_KEY)).toBe('corrupt');
  const newer = JSON.stringify({ version: 100, state: migrated });
  window.localStorage.setItem(MOCK_DATABASE_KEY, newer);
  await expect(readMockDatabase()).rejects.toMatchObject({ code: 'protocol' });
  expect(window.localStorage.getItem(MOCK_DATABASE_KEY)).toBe(newer);
});
it('never reports success when durable writes are rejected', async () => {
  const api = createMockIdentityService(() => owner);
  const self = await api.me();
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Full', 'QuotaExceededError');
  });
  await expect(
    api.updateMe({ name: 'Not saved', email: self.email, version: self.version }),
  ).rejects.toMatchObject({ code: 'persistence' });
  write.mockRestore();
  expect((await api.me()).name).toBe('Rin');
});
it('rejects malformed or mismatched backend payloads without fabricating users', async () => {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ user: { id: 'invalid' } }));
  const api = createBackendIdentityService('/api', request);
  await expect(api.me()).rejects.toMatchObject({ code: 'protocol' });
  const user = (await readMockDatabase()).users[0];
  request.mockResolvedValue(Response.json({ user }));
  await expect(api.read('member-001')).rejects.toMatchObject({ code: 'protocol' });
  request.mockResolvedValue(Response.json({ error: { code: 'unavailable' } }, { status: 401 }));
  await expect(api.me()).rejects.toMatchObject({ code: 'unauthenticated' });
});
it('retains timeout/network/protocol distinctions and never falls back to Mock', async () => {
  const network = createBackendIdentityService('/api', () =>
    Promise.reject(new TypeError('offline')),
  );
  await expect(network.me()).rejects.toMatchObject({ code: 'network' });
  vi.useFakeTimers();
  const call = createJsonClient(
    '/api',
    (_input, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  const pending = expect(call('/me')).rejects.toMatchObject({ code: 'timeout' });
  await vi.advanceTimersByTimeAsync(15000);
  await pending;
  vi.useRealTimers();
});
