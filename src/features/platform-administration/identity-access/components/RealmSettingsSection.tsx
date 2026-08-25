import { Alert } from '@/shared/components/alert/Alert'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { CheckboxField, Field, Input, Select } from '@/shared/components/form/FormControls'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { RealmLoginPreview } from '../services/identityAdminGateway'
import { IdentityContentPanel, IdentitySettingsSection } from './IdentityResourceLayout'

const CANONICAL_REALM_TABS = ['general', 'login', 'user-profile', 'email', 'themes', 'keys', 'events', 'localization', 'security-defenses', 'sessions', 'tokens'] as const
const VISIBLE_REALM_TABS = [
  { value: 'general', label: 'General' },
  { value: 'login', label: 'Login' },
  { value: 'user-profile', label: 'User profile' },
  { value: 'email', label: 'Email' },
  { value: 'themes', label: 'Themes' },
] as const
type RealmSettingsTabId = (typeof CANONICAL_REALM_TABS)[number]

interface RealmSettingsSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isRealmSettingsTab(tabId: IdentityAccessTabId | null): tabId is RealmSettingsTabId {
  return CANONICAL_REALM_TABS.some(tab => tab === tabId)
}

export function RealmSettingsSection({ tabId, onTabChange }: RealmSettingsSectionProps) {
  const { data, error, isMutating, mutationError, gateway, mutate } = useIdentityAdminPreview()
  const activeTab: RealmSettingsTabId = isRealmSettingsTab(tabId) ? tabId : 'general'
  const realm = data?.realm

  let content
  if (error) {
    content = <div className="p-4"><EmptyState title="Realm preview could not be loaded" description={error.message} /></div>
  } else if (!realm) {
    content = <div className="p-4"><EmptyState title="Loading realm preview" description="Reading the frontend IdentityAdminGateway adapter." /></div>
  } else if (activeTab === 'general') {
    content = (
      <IdentitySettingsSection title="General" description="Realm context supplied by the frontend preview adapter.">
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label="Realm name" htmlFor="realm-name"><Input id="realm-name" value={realm.realmName} readOnly /></Field>
          <Field label="Display name" htmlFor="realm-display-name"><Input id="realm-display-name" value={realm.displayName} readOnly /></Field>
        </div>
        <p className="mt-4 text-xs text-text-muted">Preview only. These values are not persisted or read from deployed Keycloak configuration.</p>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'login') {
    content = <LoginPreview value={realm.login} disabled={isMutating} onChange={next => mutate(() => gateway.updateRealmLogin(next))} />
  } else if (activeTab === 'user-profile') {
    content = (
      <IdentitySettingsSection title="User profile" description="Candidate requirements and editability for ABCO identity fields.">
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm" aria-label="User profile attributes">
            <thead><tr className="border-b border-border text-xs text-text-muted"><th className="p-3">Attribute</th><th className="p-3">Requirement</th><th className="p-3">Editability</th></tr></thead>
            <tbody>{realm.userProfile.map(attribute => <tr key={attribute.id} className="border-b border-border last:border-0"><th className="p-3 font-semibold text-text-primary">{attribute.label}</th><td className="p-3">{attribute.isRequired ? 'Required' : 'Optional'}</td><td className="p-3">{attribute.editability === 'user' ? 'User editable' : 'Administrator editable'}</td></tr>)}</tbody>
          </table>
        </div>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'email') {
    content = (
      <IdentitySettingsSection title="Email" description="Safe SMTP preview. Authentication material is masked and never exposed to the frontend.">
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Field label="SMTP host" htmlFor="smtp-host"><Input id="smtp-host" value={realm.email.host} readOnly /></Field>
          <Field label="SMTP port" htmlFor="smtp-port"><Input id="smtp-port" value={realm.email.port} readOnly /></Field>
          <Field label="From address" htmlFor="smtp-from"><Input id="smtp-from" value={realm.email.fromAddress} readOnly /></Field>
          <Field label="Authentication material" htmlFor="smtp-auth"><Input id="smtp-auth" value="Not exposed" readOnly /></Field>
        </div>
        <p className="mt-4 text-xs text-text-muted">Status: {realm.email.status === 'preview-configured' ? 'Preview configured' : 'Not configured'} · TLS {realm.email.usesTls ? 'enabled' : 'disabled'} · No persistence.</p>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'themes') {
    content = (
      <IdentitySettingsSection title="Themes" description="Selected login-theme preview; this does not change deployed realm configuration.">
        <div className="max-w-md"><Field label="Login theme" htmlFor="login-theme"><Select id="login-theme" value={realm.loginTheme} disabled><option value="abco">abco</option><option value="keycloak">keycloak</option></Select></Field></div>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'events') {
    content = <div><IdentitySettingsSection title="User event settings" description="Canonical deep-link target retained for backend integration."><EmptyState title="User event settings not connected" description="A future gateway adapter can supply event persistence settings." /></IdentitySettingsSection><IdentitySettingsSection title="Admin event settings" description="Canonical deep-link target retained for backend integration."><EmptyState title="Admin event settings not connected" description="A future gateway adapter can supply administrator event settings." /></IdentitySettingsSection></div>
  } else {
    content = <div className="p-4"><EmptyState title="Integration seam retained" description={`The canonical ${activeTab} deep link remains available for a future backend adapter.`} /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs items={VISIBLE_REALM_TABS} value={activeTab} onChange={onTabChange} ariaLabel="Realm settings sections" indicator="inset" scrollControls={{ previousLabel: 'Scroll Realm settings sections left', nextLabel: 'Scroll Realm settings sections right' }} />
      {mutationError ? <Alert className="m-4 mb-0" variant="error" title="Realm change could not be completed" description={mutationError.message} /> : null}
      <div className="min-w-0">{content}</div>
    </IdentityContentPanel>
  )
}

function LoginPreview({ value, disabled, onChange }: { value: RealmLoginPreview; disabled: boolean; onChange: (value: RealmLoginPreview) => Promise<unknown> }) {
  const toggle = (key: keyof RealmLoginPreview) => {
    if (disabled) return
    void onChange({ ...value, [key]: !value[key] })
  }
  return (
    <IdentitySettingsSection title="Login" description="Candidate login settings represented as editable preview state.">
      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxField label="User registration" checked={value.isUserRegistrationEnabled} disabled={disabled} onChange={() => { toggle('isUserRegistrationEnabled') }} />
        <CheckboxField label="Email as username" checked={value.isEmailLoginEnabled} disabled={disabled} onChange={() => { toggle('isEmailLoginEnabled') }} />
        <CheckboxField label="Remember me" checked={value.isRememberMeEnabled} disabled={disabled} onChange={() => { toggle('isRememberMeEnabled') }} />
        <CheckboxField label="Verify email" checked={value.isEmailVerificationRequired} disabled={disabled} onChange={() => { toggle('isEmailVerificationRequired') }} />
      </div>
      <p className="mt-4 text-xs text-text-muted">Changes stay in this preview and are not persisted to a realm.</p>
    </IdentitySettingsSection>
  )
}
