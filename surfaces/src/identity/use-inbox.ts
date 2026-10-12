'use client';
import { useState, useSyncExternalStore } from 'react';
import { useFrontendTranslation } from '@community-go/i18n';
import {
  useNotificationsPort,
  type NotificationItem,
} from '@community-go/plugin-framework/notifications';
import { useIdentityQuery } from './use-query';
import { useIdentityPort } from './context';
import { IdentityError } from './model';

/** One presentation collection for the shell and full inbox; backend records remain unpersisted. */
export function useProductInbox() {
  const port = useIdentityPort();
  const events = useNotificationsPort();
  const { t } = useFrontendTranslation();
  const local = useSyncExternalStore(
    (listener) => events.subscribe(listener),
    () => events.list(),
    () => events.list(),
  );
  const result = useIdentityQuery('inbox', async (service) => {
    const [access, items] = await Promise.all([service.access(), service.inbox()]);
    return { access, items };
  });
  const [failure, setFailure] = useState<IdentityError | null>(null);
  const [pending, setPending] = useState(false);
  const remote: NotificationItem[] = (result.data?.items ?? []).map((item) => {
    const access = result.data?.access;
    const own = item.objectId === access?.user.id && !item.operation.startsWith('roles.');
    const role = item.operation.startsWith('roles.');
    const canNavigate = own || access?.permissions.includes(role ? 'roles.read' : 'users.read');
    return {
      id: item.id,
      category: item.category,
      severity: 'notice',
      createdAt: new Date(item.createdAt).getTime(),
      read: item.read,
      title: t('management.notificationTitle', {
        operation: t(`management.operations.${item.operation}`),
        name: item.objectName,
      }),
      description: t('management.businessEvent'),
      ...(canNavigate
        ? {
            target: own
              ? { routeId: 'account' }
              : { routeId: role ? 'roles.detail' : 'users.detail', query: { id: item.objectId } },
          }
        : {}),
    };
  });
  const items = [...remote, ...local].sort(
    (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id),
  );
  async function markRead(ids: readonly string[]) {
    if (pending || !ids.length) return;
    setPending(true);
    setFailure(null);
    try {
      const remoteIds = ids.filter((id) => result.data?.items.some((item) => item.id === id));
      // API writes use a bounded batch; confirmed chunks stay read if a later request fails.
      for (let index = 0; index < remoteIds.length; index += 200)
        await port.readNotifications(remoteIds.slice(index, index + 200));
      ids.filter((id) => local.some((item) => item.id === id)).forEach((id) => events.markRead(id));
      result.reload();
    } catch (error) {
      setFailure(error instanceof IdentityError ? error : new IdentityError('unavailable'));
    } finally {
      setPending(false);
    }
  }
  return {
    items,
    unread: items.filter((item) => !item.read).length,
    loading: result.loading,
    error: result.error,
    failure,
    pending,
    reload: result.reload,
    markRead,
  };
}
