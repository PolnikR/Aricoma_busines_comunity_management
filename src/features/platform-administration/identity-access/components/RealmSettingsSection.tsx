import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { CheckboxField, Field, Input, Select } from '@/shared/components/form/FormControls'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { RealmLoginPreview, UserProfileAttributeView } from '../services/identityAdminGateway'
import { IdentityContentPanel, IdentitySettingsSection } from './IdentityResourceLayout'

const CANONICAL_REALM_TABS = ['general', 'login', 'user-profile', 'email', 'themes', 'keys', 'events', 'localization', 'security-defenses', 'sessions', 'tokens'] as const
const VISIBLE_REALM_TABS = ['general', 'login', 'user-profile', 'email', 'themes'] as const
type RealmSettingsTabId = (typeof CANONICAL_REALM_TABS)[number]

interface RealmSettingsSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isRealmSettingsTab(tabId: IdentityAccessTabId | null): tabId is RealmSettingsTabId {
  return CANONICAL_REALM_TABS.some(tab => tab === tabId)
}

export function RealmSettingsSection({ tabId, onTabChange }: RealmSettingsSectionProps) {
  const { t } = useTranslation()
  const { data, error, isMutating, mutationError, gateway, mutate } = useIdentityAdminPreview()
  const activeTab: RealmSettingsTabId = isRealmSettingsTab(tabId) ? tabId : 'general'
  const realm = data?.realm
  const tabs = VISIBLE_REALM_TABS.map(value => ({ value, label: t(`identity.realm.tabs.${value}`) }))

  let content
  if (error) {
    content = <div className="p-4"><EmptyState title={t('identity.realm.loadFailed')} description={error.message} /></div>
  } else if (!realm) {
    content = <div className="p-4"><EmptyState title={t('identity.realm.loading')} description={t('identity.common.adapterReading')} /></div>
  } else if (activeTab === 'general') {
    content = (
      <IdentitySettingsSection title={t('identity.realm.tabs.general')} description={t('identity.realm.general.description')}>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label={t('identity.realm.general.realmName')} htmlFor="realm-name"><Input id="realm-name" value={realm.realmName} readOnly /></Field>
          <Field label={t('identity.realm.general.displayName')} htmlFor="realm-display-name"><Input id="realm-display-name" value={realm.displayName} readOnly /></Field>
        </div>
        <p className="mt-4 text-xs text-text-muted">{t('identity.realm.general.previewNote')}</p>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'login') {
    content = <LoginPreview value={realm.login} disabled={isMutating} onChange={next => mutate(() => gateway.updateRealmLogin(next))} />
  } else if (activeTab === 'user-profile') {
    content = (
      <IdentitySettingsSection title={t('identity.realm.tabs.user-profile')} description={t('identity.realm.userProfile.description')}>
        <UserProfileTable attributes={realm.userProfile} />
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'email') {
    content = (
      <IdentitySettingsSection title={t('identity.realm.tabs.email')} description={t('identity.realm.email.description')}>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label={t('identity.realm.email.host')} htmlFor="smtp-host"><Input id="smtp-host" value={realm.email.host} readOnly /></Field>
          <Field label={t('identity.realm.email.port')} htmlFor="smtp-port"><Input id="smtp-port" value={realm.email.port} readOnly /></Field>
          <Field label={t('identity.realm.email.from')} htmlFor="smtp-from"><Input id="smtp-from" value={realm.email.fromAddress} readOnly /></Field>
          <Field label={t('identity.realm.email.authMaterial')} htmlFor="smtp-auth"><Input id="smtp-auth" value={t('identity.realm.email.notExposed')} readOnly /></Field>
        </div>
        <p className="mt-4 text-xs text-text-muted">{t('identity.realm.email.statusLine', { status: realm.email.status === 'preview-configured' ? t('identity.realm.email.previewConfigured') : t('identity.realm.email.notConfigured'), tls: realm.email.usesTls ? t('identity.realm.email.tlsEnabled') : t('identity.realm.email.tlsDisabled') })}</p>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'themes') {
    content = (
      <IdentitySettingsSection title={t('identity.realm.tabs.themes')} description={t('identity.realm.themes.description')}>
        <div className="max-w-md"><Field label={t('identity.realm.themes.loginTheme')} htmlFor="login-theme"><Select id="login-theme" value={realm.loginTheme} disabled><option value="abco">abco</option><option value="keycloak">keycloak</option></Select></Field></div>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'events') {
    content = <div><IdentitySettingsSection title={t('identity.realm.events.userTitle')} description={t('identity.realm.events.deepLink')}><EmptyState title={t('identity.realm.events.userEmpty')} description={t('identity.realm.events.userDescription')} /></IdentitySettingsSection><IdentitySettingsSection title={t('identity.realm.events.adminTitle')} description={t('identity.realm.events.deepLink')}><EmptyState title={t('identity.realm.events.adminEmpty')} description={t('identity.realm.events.adminDescription')} /></IdentitySettingsSection></div>
  } else {
    content = <div className="p-4"><EmptyState title={t('identity.common.integration.title')} description={t('identity.common.integration.description', { tab: activeTab })} /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs items={tabs} value={activeTab} onChange={onTabChange} ariaLabel={t('identity.realm.tabs.ariaLabel')} indicator="inset" scrollControls={{ previousLabel: t('identity.realm.tabs.scrollPrevious'), nextLabel: t('identity.realm.tabs.scrollNext') }} />
      {mutationError ? <Alert className="m-4 mb-0" variant="error" title={t('identity.realm.mutationFailed')} description={mutationError.message} /> : null}
      <div className="min-w-0">{content}</div>
    </IdentityContentPanel>
  )
}

function UserProfileTable({ attributes }: { attributes: UserProfileAttributeView[] }) {
  const { t } = useTranslation()
  const columns: ColumnDef<UserProfileAttributeView>[] = [
    {
      id: 'attribute',
      header: t('identity.realm.userProfile.columns.attribute'),
      cell: attribute => <span className="font-semibold text-text-primary">{attribute.label}</span>,
    },
    {
      id: 'requirement',
      header: t('identity.realm.userProfile.columns.requirement'),
      cell: attribute => attribute.isRequired ? t('identity.realm.userProfile.required') : t('identity.realm.userProfile.optional'),
    },
    {
      id: 'editability',
      header: t('identity.realm.userProfile.columns.editability'),
      cell: attribute => attribute.editability === 'user' ? t('identity.realm.userProfile.userEditable') : t('identity.realm.userProfile.adminEditable'),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={attributes}
      rowKey={attribute => attribute.id}
      ariaLabel={t('identity.realm.userProfile.ariaLabel')}
      minWidthClassName="min-w-[34rem]"
    />
  )
}

function LoginPreview({ value, disabled, onChange }: { value: RealmLoginPreview; disabled: boolean; onChange: (value: RealmLoginPreview) => Promise<unknown> }) {
  const { t } = useTranslation()
  const toggle = (key: keyof RealmLoginPreview) => {
    if (disabled) return
    void onChange({ ...value, [key]: !value[key] })
  }
  return (
    <IdentitySettingsSection title={t('identity.realm.tabs.login')} description={t('identity.realm.login.description')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxField label={t('identity.realm.login.registration')} checked={value.isUserRegistrationEnabled} disabled={disabled} onChange={() => { toggle('isUserRegistrationEnabled') }} />
        <CheckboxField label={t('identity.realm.login.emailAsUsername')} checked={value.isEmailLoginEnabled} disabled={disabled} onChange={() => { toggle('isEmailLoginEnabled') }} />
        <CheckboxField label={t('identity.realm.login.rememberMe')} checked={value.isRememberMeEnabled} disabled={disabled} onChange={() => { toggle('isRememberMeEnabled') }} />
        <CheckboxField label={t('identity.realm.login.verifyEmail')} checked={value.isEmailVerificationRequired} disabled={disabled} onChange={() => { toggle('isEmailVerificationRequired') }} />
      </div>
      <p className="mt-4 text-xs text-text-muted">{t('identity.realm.login.previewNote')}</p>
    </IdentitySettingsSection>
  )
}
