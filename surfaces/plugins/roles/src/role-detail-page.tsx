'use client';
import { useFrontendTranslation, formatNumber } from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import {
  IdentityError,
  defaultUserQuery,
  useIdentityPort,
} from '@community-go/surface/identity/runtime';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityModeNotice, IdentityQueryState } from '../../../src/identity/query-state';
export function RoleDetailPage({ id }: Readonly<{ id: string | null }>) {
  const { t, locale } = useFrontendTranslation();
  const port = useIdentityPort();
  const result = useIdentityQuery(`role:${id}`, async (service) => {
    const { identifierSchema } = await import('../../../src/identity/model');
    if (!identifierSchema.safeParse(id).success || !id) throw new IdentityError('not-found');
    const access = await service.access();
    if (!access.permissions.includes('roles.read')) throw new IdentityError('forbidden');
    const role = await service.readRole(id);
    const members = access.permissions.includes('users.read')
      ? await service.list({ ...defaultUserQuery, roleId: id, pageSize: 10 })
      : null;
    return { access, role, members };
  });
  const data = result.data;
  return (
    <Page>
      <PageHeader
        title={
          data
            ? ['administrator', 'operator', 'viewer'].includes(data.role.id)
              ? t(`identityProduct.roleNames.${data.role.id}`)
              : data.role.name
            : t('roles.detail')
        }
        description={t('roles.description')}
        actions={<RouteLink target={route('roles')}>{t('roles.back')}</RouteLink>}
      />
      <IdentityModeNotice mode={port.mode} />
      {result.error || !data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <>
          <Section
            title={t('roles.permissions')}
            description={t(data.role.protected ? 'roles.protected' : 'roles.impact')}
          >
            <div className="grid gap-4 p-5">
              {!data.role.protected &&
              !data.access.user.roleIds.includes(data.role.id) &&
              data.access.permissions.includes('roles.update') ? (
                <RouteLink target={route('roles.edit', {}, { query: { id: data.role.id } })}>
                  {t('roles.edit')}
                </RouteLink>
              ) : null}
              {data.role.permissions.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('roles.noPermissions')}</p>
              ) : (
                <ul data-reveal-items className="grid gap-3 sm:grid-cols-2">
                  {data.role.permissions.map((permission) => (
                    <li key={permission} className="rounded-control bg-surface-muted p-3">
                      <p className="text-sm font-semibold">
                        {t(`management.permissions.${permission}`)}
                      </p>
                      <code className="text-xs text-ink-muted">{permission}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>
          <Section title={t('roles.members')} description={t('roles.membersHint')}>
            <div className="grid gap-3 p-5">
              {!data.members ? (
                <p className="text-sm text-ink-muted">{t('roles.membersDenied')}</p>
              ) : (
                <>
                  <p className="text-sm text-ink-muted">
                    {t('roles.memberCount', { value: formatNumber(locale, data.members.total) })}
                  </p>
                  <ul data-reveal-items className="grid gap-3">
                    {data.members.items.map((member) => (
                      <li key={member.id}>
                        <RouteLink target={route('users.detail', {}, { query: { id: member.id } })}>
                          {member.name}
                        </RouteLink>
                        <p className="text-sm text-ink-muted">{member.email}</p>
                      </li>
                    ))}
                  </ul>
                  {data.members.total === 0 ? (
                    <p className="text-sm text-ink-muted">{t('roles.noMembers')}</p>
                  ) : null}
                  <RouteLink target={route('users', {}, { query: { roleId: data.role.id } })}>
                    {t('roles.allMembers')}
                  </RouteLink>
                </>
              )}
            </div>
          </Section>
        </>
      )}
    </Page>
  );
}
