'use client';
import { useEffect, useMemo, type ReactNode } from 'react';
import { createAppStore } from '@community-go/state-foundation';
import { IdentityProvider, IdentityError, type IdentityPort } from '@community-go/surface/identity';
import { useAuth, AuthContext } from '../auth/context';
import { useContext } from 'react';
import { readAuthConfig } from '../auth/config';
import { AuthError } from '../auth/contract';
import type { IdentityOperations } from './mock-service';

/** Concrete product composition; no service registry or cross-plugin private store access. */
export function IdentityRuntime({ children }: Readonly<{ children: ReactNode }>) {
  const auth = useAuth();
  const controller = useContext(AuthContext);
  if (!controller) throw new Error('AuthContext is required.');
  const authController = controller;
  const runtime = useMemo(() => {
    const revision = createAppStore<{ value: number }>(() => ({ value: 0 }));
    const invalidate = () => revision.setState((prior) => ({ value: prior.value + 1 }));
    const config = (() => {
      try {
        return readAuthConfig();
      } catch {
        return null;
      }
    })();
    let initialized: Promise<IdentityOperations> | null = null;
    let mockModule: Promise<typeof import('./mock-service')> | null = null;
    const currentUserId = () => authController.getState().session?.user.id ?? null;
    const service = async (owner: string) => {
      if (!config) throw new IdentityError('configuration');
      if (config.mode === 'mock') {
        const module = await (mockModule ??= import('./mock-service'));
        // Pending operations keep their original actor; switching accounts cannot rebind a write.
        return module.createMockIdentityService(() => owner);
      }
      return (initialized ??= import('./backend-service').then((module) =>
        module.createBackendIdentityService(config.apiBaseUrl),
      ));
    };
    async function call<T>(
      operation: (service: IdentityOperations) => Promise<T>,
      mutate = false,
      restoreIdentity = true,
    ) {
      const owner = currentUserId();
      if (!owner) throw new IdentityError('unauthenticated');
      try {
        const operations = await service(owner);
        if (owner !== currentUserId()) throw new IdentityError('unauthenticated');
        const value = await operation(operations);
        if (owner !== currentUserId()) throw new IdentityError('unauthenticated');
        if (mutate) {
          invalidate();
          if (restoreIdentity) await authController.getState().restore();
          if (owner !== currentUserId()) throw new IdentityError('unauthenticated');
        }
        return value;
      } catch (error) {
        if (
          error instanceof IdentityError &&
          error.code === 'unauthenticated' &&
          owner === currentUserId()
        )
          authController.getState().expire();
        if (error instanceof AuthError)
          throw new IdentityError(error.code === 'protocol' ? 'protocol' : 'persistence');
        throw error;
      }
    }
    const port: IdentityPort = {
      mode: config?.mode ?? 'backend',
      currentUserId,
      getRevision: () => revision.getState().value,
      subscribe: (listener) => revision.subscribe(listener),
      access: () =>
        call(async (service) => {
          const access = await service.access();
          if (access.user.id !== currentUserId()) throw new IdentityError('protocol');
          return access;
        }),
      roles: () => call((service) => service.roles()),
      readRole: (id) => call((service) => service.readRole(id)),
      createRole: (input) => call((service) => service.createRole(input), true),
      updateRole: (id, input) => call((service) => service.updateRole(id, input), true),
      inbox: () =>
        call(async (service) => {
          const items = await service.inbox();
          if (items.some((item) => item.ownerId !== currentUserId()))
            throw new IdentityError('protocol');
          return items;
        }),
      readNotifications: (ids) => call((service) => service.readNotifications(ids), true, false),
      audit: (query) => call((service) => service.audit(query)),
      readAudit: (id) => call((service) => service.readAudit(id)),
      list: (query) => call((service) => service.list(query)),
      read: (id) => call((service) => service.read(id)),
      me: () =>
        call(async (service) => {
          const user = await service.me();
          if (user.id !== currentUserId()) throw new IdentityError('protocol');
          return user;
        }),
      create: (input) => call((service) => service.create(input), true),
      update: (id, input) => call((service) => service.update(id, input), true),
      updateMe: (input) => call((service) => service.updateMe(input), true),
      setStatus: (id, version, status) =>
        call((service) => service.setStatus(id, version, status), true),
      setRoles: (id, version, roleIds) =>
        call((service) => service.setRoles(id, version, roleIds), true),
    };
    return { port, invalidate };
  }, [authController]);
  useEffect(() => {
    runtime.invalidate();
  }, [runtime, auth.session?.user.id]);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === 'community-go.auth-mock') runtime.invalidate();
    };
    window.addEventListener('storage', changed);
    window.addEventListener('focus', runtime.invalidate);
    return () => {
      window.removeEventListener('storage', changed);
      window.removeEventListener('focus', runtime.invalidate);
    };
  }, [runtime]);
  return <IdentityProvider port={runtime.port}>{children}</IdentityProvider>;
}
