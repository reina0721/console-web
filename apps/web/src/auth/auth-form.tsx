'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FoundationForm, useFoundationForm } from '@community-go/form-foundation';
import { Page, PageHeader } from '@community-go/surface-foundation/layout';
import { TextField, PasswordField } from '@community-go/ui-adapter/form-field';
import { Action } from '@community-go/ui-adapter/action';
import { AlertBanner } from '@community-go/ui-adapter/feedback';
import { useFrontendTranslation } from '@community-go/i18n';
import { useAuth } from './context';
import { AuthFrame } from './frame';
import { safeReturnTo } from './contract';
import { readRegistrationAvailability } from './registration-policy';
import type { AuthFormValues } from './form-schema';
import { AlertTriangle, CheckCircle2, Clock, Eye, EyeOff } from 'lucide-react';

export function AuthForm({ kind }: Readonly<{ kind: 'login' | 'register' | 'expired' }>) {
  const register = kind === 'register';
  const { t } = useFrontendTranslation();
  const auth = useAuth();
  const params = useSearchParams();
  const target = safeReturnTo(params.get('returnTo'));
  const [registered, setRegistered] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);
  const [policyFailure, setPolicyFailure] = useState(false);
  const [policyRetry, setPolicyRetry] = useState(0);
  useEffect(() => {
    if (!register) return;
    let cancelled = false;
    void readRegistrationAvailability().then(
      (enabled) => {
        if (!cancelled) {
          setAvailability(enabled);
          setPolicyFailure(false);
        }
      },
      () => {
        if (!cancelled) setPolicyFailure(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [register, policyRetry]);
  const visibilityIcons = {
    show: <Eye aria-hidden="true" className="size-4" />,
    hide: <EyeOff aria-hidden="true" className="size-4" />,
  };
  const form = useFoundationForm<AuthFormValues>({
    schema: () =>
      import('./form-schema').then(({ createAuthSchema }) => createAuthSchema(register)),
    defaultValues: { name: '', email: '', password: '', confirmation: '' },
  });
  const validation = (field: keyof AuthFormValues, message: string) =>
    form.hasError(field) ? { error: t(message) } : {};
  return (
    <AuthFrame>
      <Page>
        <PageHeader
          title={t(register ? 'auth.registerTitle' : 'auth.loginTitle')}
          description={t(register ? 'auth.registerDescription' : 'auth.loginDescription')}
        />
        {kind === 'expired' ? (
          <AlertBanner
            tone="warning"
            title={t('auth.expiredTitle')}
            description={t('auth.expiredDescription')}
            icon={<Clock aria-hidden="true" className="size-4" />}
          />
        ) : null}
        {auth.error ? (
          <AlertBanner
            tone="danger"
            announcement="urgent"
            title={t(`auth.errors.${auth.error}`)}
            description={t('auth.errorDescription')}
            icon={<AlertTriangle aria-hidden="true" className="size-4" />}
          />
        ) : null}
        {register && availability !== true && !registered ? (
          <div role="status" className="space-y-4">
            <p className="text-sm text-ink-muted">
              {t(
                policyFailure
                  ? 'auth.policyFailure'
                  : availability === false
                    ? 'auth.registrationClosed'
                    : 'auth.policyLoading',
              )}
            </p>
            {policyFailure ? (
              <Action
                onPress={() => {
                  setPolicyFailure(false);
                  setPolicyRetry((prior) => prior + 1);
                }}
              >
                {t('auth.policyRetry')}
              </Action>
            ) : null}
          </div>
        ) : registered ? (
          <div role="status" className="space-y-4">
            <AlertBanner
              tone="success"
              title={t('auth.registeredTitle')}
              description={t('auth.registeredDescription')}
              icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
            />
            <Action fullWidth onPress={() => window.location.replace(target)}>
              {t('auth.continue')}
            </Action>
          </div>
        ) : (
          <FoundationForm
            form={form}
            className="grid gap-5"
            onSubmit={async (values) => {
              const input = { email: values.email, password: values.password };
              const accepted = register
                ? await auth.register({ ...input, name: values.name })
                : await auth.login(input);
              if (!accepted) return;
              form.reset();
              if (register) setRegistered(true);
              else window.location.replace(target);
            }}
          >
            {register ? (
              <TextField
                label={t('auth.name')}
                autoComplete="name"
                disabled={auth.busy}
                {...validation('name', 'auth.nameError')}
                {...form.registerField('name')}
              />
            ) : null}
            <TextField
              label={t('auth.email')}
              purpose="email"
              autoComplete="username"
              disabled={auth.busy}
              {...validation('email', 'auth.emailError')}
              {...form.registerField('email')}
            />
            <PasswordField
              label={t('auth.password')}
              purpose={register ? 'new' : 'current'}
              disabled={auth.busy}
              showLabel={t('auth.showPassword')}
              visibilityIcons={visibilityIcons}
              hideLabel={t('auth.hidePassword')}
              {...(register ? { hint: t('auth.passwordRule') } : {})}
              {...validation('password', register ? 'auth.passwordRule' : 'auth.passwordRequired')}
              {...form.registerField('password')}
            />
            {register ? (
              <PasswordField
                label={t('auth.confirmation')}
                purpose="new"
                disabled={auth.busy}
                showLabel={t('auth.showConfirmation')}
                visibilityIcons={visibilityIcons}
                hideLabel={t('auth.hideConfirmation')}
                {...validation('confirmation', 'auth.confirmationError')}
                {...form.registerField('confirmation')}
              />
            ) : null}
            <Action type="submit" loading={auth.busy || form.isSubmitting} fullWidth>
              {t(register ? 'auth.registerSubmit' : 'auth.loginSubmit')}
            </Action>
          </FoundationForm>
        )}
        <p className="text-sm text-ink-muted">
          {t(register ? 'auth.hasAccount' : 'auth.noAccount')}{' '}
          <Link
            className="font-semibold text-brand underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            href={`${register ? '/login' : '/register'}?returnTo=${encodeURIComponent(target)}`}
          >
            {t(register ? 'auth.loginLink' : 'auth.registerLink')}
          </Link>
        </p>
      </Page>
    </AuthFrame>
  );
}
