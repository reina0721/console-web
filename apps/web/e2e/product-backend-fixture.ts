import type { BrowserContext } from '@playwright/test';
import {
  permissionCodes,
  registrationSettingsInputSchema,
  createUserSchema,
  updateUserSchema,
  roleInputSchema,
  updateRoleSchema,
  readNotificationsSchema,
  userQuerySchema,
  auditQuerySchema,
  type DirectoryUser,
  type DirectoryRole,
  type ProductNotification,
  type AuditRecord,
} from '@community-go/surface/identity';

/** Controlled HTTP contract fixture. It proves adapter/UI requests, never a real backend deployment. */
export async function installProductBackend(context: BrowserContext) {
  const date = '2026-10-12T00:00:00.000Z';
  const admin: DirectoryUser = {
    id: 'backend-review',
    name: 'Backend Review',
    email: 'backend@example.test',
    status: 'active',
    roleIds: ['administrator'],
    version: 1,
    createdAt: date,
    updatedAt: date,
  };
  const users: DirectoryUser[] = [admin];
  const roles: DirectoryRole[] = [
    {
      id: 'administrator',
      name: 'Administrator',
      permissions: [...permissionCodes],
      protected: true,
      version: 1,
      createdAt: date,
      updatedAt: date,
    },
    {
      id: 'viewer',
      name: 'Viewer',
      permissions: ['account.update'],
      protected: true,
      version: 1,
      createdAt: date,
      updatedAt: date,
    },
  ];
  let registrationSettings = {
    enabled: true,
    defaultRoleId: 'viewer',
    version: 1,
    updatedAt: date,
  };
  const notifications: ProductNotification[] = [];
  const audit: AuditRecord[] = [];
  const writes: { path: string; method: string; csrf: string | undefined }[] = [];
  let nextId = 0;
  let conflict = false;
  let policyConflict = false;
  function record(operation: AuditRecord['operation'], objectId: string, objectName: string) {
    nextId += 1;
    audit.unshift({
      id: `audit-${nextId}`,
      actorId: admin.id,
      actorName: admin.name,
      objectId,
      objectName,
      operation,
      createdAt: date,
      result: 'success',
    });
    notifications.unshift({
      id: `notice-${nextId}`,
      ownerId: admin.id,
      objectId,
      objectName,
      operation,
      category: 'success',
      createdAt: date,
      read: false,
    });
  }
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method();
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    const error = (status: number, code: string, reason?: string) =>
      reply({ error: { code, ...(reason ? { reason } : {}) } }, status);
    if (path === '/auth/csrf') return reply({ token: 'product-csrf' });
    if (method !== 'GET') {
      writes.push({ path, method, csrf: request.headers()['x-csrf-token'] });
      if (request.headers()['x-csrf-token'] !== 'product-csrf') return error(403, 'forbidden');
    }
    if (path === '/auth/session')
      return reply({
        user: { id: admin.id, name: admin.name, email: admin.email },
        expiresAt: Date.now() + 3_600_000,
      });
    if (path === '/auth/access') return reply({ user: admin, permissions: [...permissionCodes] });
    const body: unknown = method === 'GET' ? undefined : request.postDataJSON();
    if (path === '/auth/registration-policy')
      return reply({ enabled: registrationSettings.enabled });
    if (path === '/system/registration' && method === 'GET')
      return reply({ settings: registrationSettings });
    if (path === '/system/registration' && method === 'PATCH') {
      const parsed = registrationSettingsInputSchema.safeParse(body);
      if (!parsed.success) return error(422, 'validation');
      if (policyConflict) {
        policyConflict = false;
        registrationSettings = {
          ...registrationSettings,
          version: registrationSettings.version + 1,
        };
        return error(409, 'conflict', 'stale-version');
      }
      if (parsed.data.version !== registrationSettings.version)
        return error(409, 'conflict', 'stale-version');
      if (parsed.data.defaultRoleId !== 'viewer') return error(422, 'validation');
      registrationSettings = {
        ...parsed.data,
        version: registrationSettings.version + 1,
        updatedAt: date,
      };
      record('settings.update', 'registration-policy', 'Registration policy');
      return reply({ settings: registrationSettings });
    }
    if (path === '/me' && method === 'GET') return reply({ user: admin });
    if (path === '/roles' && method === 'GET') return reply({ items: roles });
    if (path === '/roles' && method === 'POST') {
      const parsed = roleInputSchema.safeParse(body);
      if (!parsed.success) return error(422, 'validation');
      const role: DirectoryRole = {
        ...parsed.data,
        id: `custom-${++nextId}`,
        protected: false,
        version: 1,
        createdAt: date,
        updatedAt: date,
      };
      roles.push(role);
      record('roles.create', role.id, role.name);
      return reply({ role }, 201);
    }
    const roleId = /^\/roles\/([^/]+)$/.exec(path)?.[1];
    if (roleId) {
      const role = roles.find((item) => item.id === decodeURIComponent(roleId));
      if (!role) return error(404, 'not-found');
      if (method === 'GET') return reply({ role });
      if (method === 'PATCH') {
        const parsed = updateRoleSchema.safeParse(body);
        if (!parsed.success) return error(422, 'validation');
        if (role.protected) return error(409, 'conflict', 'protected-role');
        if (parsed.data.version !== role.version) return error(409, 'conflict', 'stale-version');
        Object.assign(role, parsed.data, { version: role.version + 1 });
        record('roles.update', role.id, role.name);
        return reply({ role });
      }
    }
    if (path === '/users' && method === 'GET') {
      const parsed = userQuerySchema.safeParse({
        q: url.searchParams.get('q'),
        status: url.searchParams.get('status'),
        roleId: url.searchParams.get('roleId'),
        sort: url.searchParams.get('sort'),
        direction: url.searchParams.get('direction'),
        page: Number(url.searchParams.get('page')),
        pageSize: Number(url.searchParams.get('pageSize')),
      });
      if (!parsed.success) return error(422, 'validation');
      const query = parsed.data;
      const items = users.filter(
        (user) =>
          (!query.q ||
            `${user.name} ${user.email}`.toLowerCase().includes(query.q.toLowerCase())) &&
          (query.status === 'all' || query.status === user.status) &&
          (query.roleId === 'all' || user.roleIds.includes(query.roleId)),
      );
      const start = (query.page - 1) * query.pageSize;
      return reply({
        items: items.slice(start, start + query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
      });
    }
    if (path === '/users' && method === 'POST') {
      const parsed = createUserSchema.safeParse(body);
      if (!parsed.success) return error(422, 'validation');
      const { name, email, roleIds, status } = parsed.data;
      const user: DirectoryUser = {
        name,
        email,
        roleIds,
        status,
        id: `user-${++nextId}`,
        version: 1,
        createdAt: date,
        updatedAt: date,
      };
      users.push(user);
      record('users.create', user.id, user.name);
      return reply({ user }, 201);
    }
    const userId = /^\/users\/([^/]+)$/.exec(path)?.[1];
    const user = path === '/me' ? admin : users.find((item) => item.id === userId);
    if (user && method === 'GET') return reply({ user });
    if (user && method === 'PATCH') {
      const parsed = updateUserSchema.safeParse(body);
      if (!parsed.success) return error(422, 'validation');
      if (conflict) {
        conflict = false;
        user.version += 1;
        user.name = 'Server profile';
        return error(409, 'conflict', 'stale-version');
      }
      if (user.version !== parsed.data.version) return error(409, 'conflict', 'stale-version');
      Object.assign(user, parsed.data, { version: user.version + 1 });
      record(path === '/me' ? 'account.update' : 'users.update', user.id, user.name);
      return reply({ user });
    }
    if (path === '/notifications' && method === 'GET') return reply({ items: notifications });
    if (path === '/notifications/read' && method === 'PATCH') {
      const parsed = readNotificationsSchema.safeParse(body);
      if (!parsed.success) return error(422, 'validation');
      if (parsed.data.ids.some((id) => !notifications.some((item) => item.id === id)))
        return error(404, 'not-found');
      notifications.forEach((item) => {
        if (parsed.data.ids.includes(item.id)) item.read = true;
      });
      return route.fulfill({ status: 204 });
    }
    if (path === '/audit-logs' && method === 'GET') {
      const parsed = auditQuerySchema.safeParse({
        q: url.searchParams.get('q'),
        operation: url.searchParams.get('operation'),
        result: url.searchParams.get('result'),
        page: Number(url.searchParams.get('page')),
        pageSize: Number(url.searchParams.get('pageSize')),
      });
      if (!parsed.success) return error(422, 'validation');
      const query = parsed.data;
      const items = audit.filter(
        (item) =>
          (!query.q ||
            `${item.actorName} ${item.objectName}`.toLowerCase().includes(query.q.toLowerCase())) &&
          (query.operation === 'all' || item.operation === query.operation) &&
          (query.result === 'all' || item.result === query.result),
      );
      const start = (query.page - 1) * query.pageSize;
      return reply({
        items: items.slice(start, start + query.pageSize),
        total: items.length,
        page: query.page,
        pageSize: query.pageSize,
      });
    }
    const auditId = /^\/audit-logs\/([^/]+)$/.exec(path)?.[1];
    if (auditId && method === 'GET') {
      const record = audit.find((item) => item.id === auditId);
      return record ? reply({ record }) : error(404, 'not-found');
    }
    return error(404, 'not-found');
  });
  return {
    writes,
    rejectNextProfileWrite: () => {
      conflict = true;
    },
    rejectNextPolicyWrite: () => {
      policyConflict = true;
    },
  };
}
