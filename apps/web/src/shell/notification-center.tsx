'use client';

import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { proceedAfterLeaveConfirm } from '../host/leave-confirm';
import { routeTargetResolver } from '../host/route-target-resolver';

import { formatRelativeTime, formatTimeOfDay, useFrontendTranslation } from '@community-go/i18n';
import { Action } from '@community-go/ui-adapter/action';
import { Badge } from '@community-go/ui-adapter/feedback';
import { StatusPill } from '@community-go/ui-adapter/status-pill';
import { DrawerSurface } from '@community-go/ui-adapter/overlays';
import { useProductInbox } from '@community-go/surface/identity';
import { useShellStore } from '../state/use-shell-store';

/** 相对时间 caption（语言与地区 relativeTime=relative）：按分钟/小时差输出。 */
function relativeCaption(locale: string, createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 60) return formatRelativeTime(locale, -minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatRelativeTime(locale, -hours, 'hour');
  return formatRelativeTime(locale, -Math.floor(hours / 24), 'day');
}

/**
 * Shell 通知中心（SET-006-005 呈现层）：顶部铃铛 + 未读角标 → 受控 Drawer 收纳
 * 真实前端事件通知（数据层/发布方已 e2e 验证）。
 *
 * 偏好门控：通知偏好 inAppNotifications 关时不显示铃铛入口（产品强制的高风险/错误
 * 通知仍由发布方收纳进 store，本入口隐藏不代表丢失）；showBadge 关时不显示未读角标。
 */
export function NotificationCenter({
  triggerLabel: customTriggerLabel,
}: Readonly<{ triggerLabel?: string }> = {}) {
  const router = useRouter();
  const { t, locale } = useFrontendTranslation();
  const [open, setOpen] = useState(false);
  const inbox = useProductInbox();
  const { items, unread } = inbox;
  const inAppNotifications = useShellStore(
    (state) => state.preferences.notifications.inAppNotifications,
  );
  const showBadge = useShellStore((state) => state.preferences.notifications.showBadge);
  // 未读提醒（通知偏好 unreadReminder，默认开）：未读行的高亮与"现在"标记。
  // 关时未读行视觉与已读一致（角标/计数仍由 showBadge/unread 独立管理）。
  const unreadReminder = useShellStore((state) => state.preferences.notifications.unreadReminder);
  // 时刻显示（语言与地区 hourCycle/showSeconds/timeZone）：通知条目真实时钟消费。
  const localeRegion = useShellStore((state) => state.preferences.localeRegion);

  if (!inAppNotifications) return null;

  const openCenter = () => setOpen(true);
  const markAllRead = () => {
    void inbox.markRead(items.filter((item) => !item.read).map((item) => item.id));
  };

  const triggerLabel =
    showBadge && unread > 0
      ? t('shell.notifications') + '，' + t('shell.unreadCount', { count: unread })
      : t('shell.notifications');

  return (
    <>
      {customTriggerLabel ? (
        <Action variant="secondary" size="sm" onPress={openCenter}>
          {customTriggerLabel}
        </Action>
      ) : (
        <button
          aria-controls="notification-center"
          aria-expanded={open}
          aria-label={triggerLabel}
          className="relative shrink-0 rounded-control border border-border bg-surface text-ink-muted outline-none transition-colors hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-brand grid size-control min-w-control place-items-center"
          onClick={openCenter}
          type="button"
        >
          <Bell className="size-4.5" aria-hidden="true" />
          {showBadge && unread > 0 ? (
            <span className="pointer-events-none absolute -right-1 -top-1">
              <Badge appearance="solid" size="sm" tone="info">
                {unread > 9 ? '9+' : unread}
              </Badge>
            </span>
          ) : null}
        </button>
      )}
      <DrawerSurface
        closeLabel={t('shell.closeNotifications')}
        description={t('shell.notificationCenterDescription')}
        isOpen={open}
        onOpenChange={setOpen}
        title={t('shell.notificationCenter')}
        triggerLabel=""
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">
              {unread > 0 ? t('shell.unreadCount', { count: unread }) : ''}
            </span>
            {unread > 0 ? (
              <Action
                leadingIcon={<CheckCheck className="size-4" aria-hidden="true" />}
                disabled={inbox.pending || Boolean(inbox.error)}
                onPress={markAllRead}
                size="sm"
                variant="secondary"
              >
                {t('shell.markAllRead')}
              </Action>
            ) : null}
          </div>
          {inbox.error || inbox.failure ? (
            <p role="alert" className="text-sm text-danger">
              {t(`identityProduct.errors.${(inbox.error ?? inbox.failure)?.code}`)}
            </p>
          ) : null}
          {inbox.loading ? (
            <p role="status" className="text-sm text-ink-muted">
              {t('identityProduct.loading')}
            </p>
          ) : null}
          <Action
            variant="secondary"
            onPress={() => {
              const href = routeTargetResolver.resolveHref({
                routeId: 'notifications',
                params: {},
              });
              void proceedAfterLeaveConfirm(href).then((proceed) => {
                if (proceed) {
                  setOpen(false);
                  router.push(href);
                }
              });
            }}
          >
            {t('management.viewAll')}
          </Action>
          {inbox.error ? (
            <Action variant="quiet" onPress={inbox.reload}>
              {t('identityProduct.retry')}
            </Action>
          ) : null}
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">{t('shell.noNotifications')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.slice(0, 10).map((item) => (
                <li key={item.id}>
                  <button
                    className={`w-full rounded-panel border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted ${item.read || !unreadReminder ? '' : 'border-brand/40 bg-brand-soft/60'}`}
                    onClick={() => {
                      if (!item.read) void inbox.markRead([item.id]);
                      const href = routeTargetResolver.resolveHref({
                        routeId: 'notifications.detail',
                        params: {},
                        query: { id: item.id },
                      });
                      void proceedAfterLeaveConfirm(href).then((proceed) => {
                        if (proceed) {
                          setOpen(false);
                          router.push(href);
                        }
                      });
                    }}
                    type="button"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{item.title}</span>
                      <StatusPill tone={item.category === 'failure' ? 'danger' : 'neutral'}>
                        {t(`shell.notificationCategory.${item.category}`)}
                      </StatusPill>
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                        {item.description}
                      </span>
                    ) : null}
                    {!item.read && unreadReminder ? (
                      <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-brand">
                        {t('shell.notificationNow')}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {localeRegion.relativeTime === 'relative'
                        ? relativeCaption(locale, item.createdAt)
                        : formatTimeOfDay(
                            locale,
                            {
                              timeZone: localeRegion.timeZone,
                              hourCycle: localeRegion.hourCycle,
                              showSeconds: localeRegion.showSeconds,
                            },
                            item.createdAt,
                          )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerSurface>
    </>
  );
}
