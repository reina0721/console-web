'use client';
import { useFrontendTranslation } from '@community-go/i18n';
import { Page, PageHeader, Section } from '@community-go/surface-foundation/layout';
import { route, RouteLink } from '@community-go/plugin-framework/plugin';
import { IdentityError, permissionCodes, useIdentityPort } from '@community-go/surface/identity';
import { useIdentityQuery } from '../../../src/identity/use-query';
import { IdentityModeNotice, IdentityQueryState } from '../../../src/identity/query-state';
export function PermissionsPage() {
  const { t } = useFrontendTranslation();
  const port = useIdentityPort();
  const result = useIdentityQuery('roles.permissions', async (service) => {
    const access = await service.access();
    if (!access.permissions.includes('roles.read')) throw new IdentityError('forbidden');
    return service.roles();
  });
  return (
    <Page>
      <PageHeader
        title={t('roles.permissions')}
        description={t('roles.description')}
        actions={<RouteLink target={route('roles')}>{t('roles.back')}</RouteLink>}
      />
      <IdentityModeNotice mode={port.mode} />
      {result.error || !result.data ? (
        <IdentityQueryState error={result.error} retry={result.reload} />
      ) : (
        <>
          {['users', 'roles', 'account', 'audit'].map((resource) => (
            <Section key={resource} title={t(`management.resources.${resource}`)}>
              <ul data-reveal-items className="grid gap-4 p-5 md:grid-cols-2">
                {permissionCodes
                  .filter((permission) => permission.startsWith(`${resource}.`))
                  .map((permission) => (
                    <li
                      key={permission}
                      className="grid gap-3 rounded-panel border border-border p-4"
                    >
                      <p className="text-sm font-semibold">
                        {t(`management.permissions.${permission}`)}
                      </p>
                      <code className="text-xs text-ink-muted">{permission}</code>
                      <ul className="flex flex-wrap gap-3">
                        {result.data
                          ?.filter((role) => role.permissions.includes(permission))
                          .map((role) => (
                            <li key={role.id}>
                              <RouteLink
                                target={route('roles.detail', {}, { query: { id: role.id } })}
                              >
                                {role.protected
                                  ? t(`identityProduct.roleNames.${role.id}`)
                                  : role.name}
                              </RouteLink>
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
              </ul>
            </Section>
          ))}
        </>
      )}
    </Page>
  );
}
