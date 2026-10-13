'use client';
import { useRef, useState, useEffect } from 'react';
import { useFrontendTranslation, formatDate, formatTimeOfDay } from '@community-go/i18n';
import {
  FoundationForm,
  FoundationControlledField,
  useFoundationForm,
} from '@community-go/form-foundation';
import { Section } from '@community-go/surface-foundation/layout';
import { FormActions } from '@community-go/surface-foundation/form-actions';
import { Action } from '@community-go/ui-adapter/action';
import { PasswordField } from '@community-go/ui-adapter/form-field';
import { ConfirmDialog } from '@community-go/ui-adapter/overlays';
import { useFeedback } from '@community-go/ui-adapter/feedback-context';
import {
  useAccountSecurityPort,
  IdentityError,
  type AccountSession,
} from '@community-go/surface/identity/runtime';
import { usePreferencesPort } from '@community-go/plugin-framework/preferences';
import { useRegisterDirtySource } from '@community-go/plugin-framework/leave-confirm';
import type { Preferences } from '@community-go/surface/preferences-model';
import { IdentityQueryState, IdentityMutationError } from '../../../src/identity/query-state';

export function AccountSecurity() {
  const port = useAccountSecurityPort();
  const { t, locale } = useFrontendTranslation();
  const { notify } = useFeedback();
  const region = usePreferencesPort<Preferences>().getSnapshot().localeRegion;
  const [sessions, setSessions] = useState<readonly AccountSession[] | null>(null);
  const [error, setError] = useState<IdentityError | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<'password' | 'others' | AccountSession | null>(
    null,
  );
  const lock = useRef(false);
  const [passwordInput, setPasswordInput] = useState<{
    currentPassword: string;
    newPassword: string;
  } | null>(null);
  const form = useFoundationForm<{ currentPassword: string; newPassword: string }>({
    schema: async () =>
      (await import('../../../src/identity/security-schema')).changePasswordSchema,
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  useRegisterDirtySource({
    pageId: 'account.security',
    message: () => t('identityProduct.unsaved'),
    isDirty: () => form.isDirty,
    isSubmitting: () => pending,
  });
  useEffect(() => {
    let active = true;
    port
      .sessions()
      .then((items) => {
        if (active) {
          setSessions(items);
          setError(null);
        }
      })
      .catch((error: unknown) => {
        if (active)
          setError(error instanceof IdentityError ? error : new IdentityError('unavailable'));
      });
    return () => {
      active = false;
    };
  }, [port, revision]);
  const timestamp = (value: string) =>
    formatDate(locale, value, region.timeZone === 'auto' ? {} : { timeZone: region.timeZone }) +
    ' · ' +
    formatTimeOfDay(locale, region, value);
  async function commit() {
    if (!confirmation || lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      if (confirmation === 'password') {
        if (!passwordInput) return;
        await port.changePassword(passwordInput.currentPassword, passwordInput.newPassword);
        setPasswordInput(null);
        form.reset({ currentPassword: '', newPassword: '' });
      } else if (confirmation === 'others') await port.revokeOtherSessions();
      else await port.revokeSession(confirmation.id);
      setConfirmation(null);
      setRevision((value) => value + 1);
      notify({ title: t('account.securitySaved'), tone: 'success' });
    } catch (error) {
      setError(error instanceof IdentityError ? error : new IdentityError('unavailable'));
      throw error;
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <Section title={t('account.security')} description={t('account.securityDescription')}>
      <div className="grid min-w-0 gap-5 p-5">
        <IdentityMutationError error={error} />
        {error?.fields.some((field) => field.field === 'password') ? (
          <p role="alert" className="text-sm text-danger">
            {t('account.passwordInvalid')}
          </p>
        ) : null}
        <FoundationForm
          form={form}
          className="grid min-w-0 gap-4"
          onSubmit={(values) => {
            setPasswordInput(values);
            setConfirmation('password');
          }}
        >
          <FoundationControlledField form={form} name="currentPassword">
            {(field) => (
              <PasswordField
                label={t('account.currentPassword')}
                purpose="current"
                showLabel={t('account.showPassword')}
                hideLabel={t('account.hidePassword')}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                disabled={pending}
                {...(form.hasError('currentPassword')
                  ? { error: t('account.passwordInvalid') }
                  : {})}
              />
            )}
          </FoundationControlledField>
          <FoundationControlledField form={form} name="newPassword">
            {(field) => (
              <PasswordField
                label={t('account.newPassword')}
                purpose="new"
                hint={t('account.passwordHint')}
                showLabel={t('account.showPassword')}
                hideLabel={t('account.hidePassword')}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                disabled={pending}
                {...(form.hasError('newPassword') ? { error: t('account.passwordInvalid') } : {})}
              />
            )}
          </FoundationControlledField>
          <FormActions
            primary={
              <Action type="submit" disabled={pending || !form.isDirty}>
                {t('account.changePassword')}
              </Action>
            }
            secondary={
              <Action
                variant="quiet"
                disabled={pending}
                onPress={() => form.reset({ currentPassword: '', newPassword: '' })}
              >
                {t('account.cancel')}
              </Action>
            }
          />
        </FoundationForm>
        <div className="grid min-w-0 gap-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{t('account.sessions')}</p>
            <Action
              variant="secondary"
              disabled={pending}
              onPress={() => setRevision((value) => value + 1)}
            >
              {t('identityProduct.refresh')}
            </Action>
          </div>
          {!sessions ? (
            <IdentityQueryState error={error} retry={() => setRevision((value) => value + 1)} />
          ) : (
            <ul data-reveal-items className="divide-y divide-border">
              {sessions.map((session) => (
                <li key={session.id} className="grid min-w-0 gap-2 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-semibold">
                      {session.device}
                      {session.current ? ` · ${t('account.currentSession')}` : ''}
                    </span>
                    <Action
                      variant="quiet"
                      disabled={pending}
                      onPress={() => setConfirmation(session)}
                    >
                      {t('account.revoke')}
                    </Action>
                  </div>
                  <dl className="grid gap-2 text-sm text-ink-muted">
                    {[
                      ['created', session.createdAt],
                      ['lastActive', session.lastActiveAt],
                      ['expires', session.expiresAt],
                    ].map(([key, value]) => (
                      <div key={key} className="flex flex-wrap justify-between gap-2">
                        <dt>{t(`account.${key}`)}</dt>
                        <dd>{timestamp(value ?? '')}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
          <Action
            variant="secondary"
            disabled={pending || !sessions?.some((session) => !session.current)}
            onPress={() => setConfirmation('others')}
          >
            {t('account.revokeOthers')}
          </Action>
        </div>
      </div>
      <ConfirmDialog
        triggerLabel=""
        title={t(confirmation === 'password' ? 'account.changePassword' : 'account.revoke')}
        description={
          typeof confirmation === 'object'
            ? (confirmation?.device ?? '')
            : t('account.securityDescription')
        }
        impact={t(
          confirmation === 'password' || (typeof confirmation === 'object' && confirmation?.current)
            ? 'account.reloginImpact'
            : 'account.revokeImpact',
        )}
        cancelLabel={t('account.cancel')}
        confirmLabel={t('account.confirm')}
        failureMessage={t('account.securityFailure')}
        isOpen={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        onConfirm={commit}
      />
    </Section>
  );
}
