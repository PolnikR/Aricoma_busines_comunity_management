import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { Tabs } from '@/shared/components/tabs/Tabs'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentitySettingsSection } from './IdentityResourceLayout'

const REALM_SETTING_TABS = [
  { value: 'general', label: 'General' },
  { value: 'login', label: 'Login' },
  { value: 'email', label: 'Email' },
  { value: 'themes', label: 'Themes' },
  { value: 'keys', label: 'Keys' },
  { value: 'events', label: 'Events' },
  { value: 'localization', label: 'Localization' },
  { value: 'security-defenses', label: 'Security defenses' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'tokens', label: 'Tokens' },
] as const

type RealmSettingsTabId = (typeof REALM_SETTING_TABS)[number]['value']

interface RealmSettingsSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isRealmSettingsTab(tabId: IdentityAccessTabId | null): tabId is RealmSettingsTabId {
  return REALM_SETTING_TABS.some(tab => tab.value === tabId)
}

export function RealmSettingsSection({ tabId, onTabChange }: RealmSettingsSectionProps) {
  const activeTab: RealmSettingsTabId = isRealmSettingsTab(tabId) ? tabId : 'general'
  let content

  if (activeTab === 'general') {
    content = (
      <IdentitySettingsSection title="General" description="Realm-level identity context currently known by the ABCO frontend.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Realm name" htmlFor="realm-name"><Input id="realm-name" value="ABCO" readOnly /></Field>
        </div>
        <p className="mt-4 text-xs text-text-muted">Additional Keycloak realm settings require the Keycloak administration contract and are intentionally not inferred.</p>
      </IdentitySettingsSection>
    )
  } else if (activeTab === 'events') {
    content = (
      <div>
        <IdentitySettingsSection title="User event settings" description="Configure persistence and listeners for user activity events.">
          <EmptyState title="User event settings not connected" description="Keycloak user-event persistence settings are not available from the current frontend contract." />
        </IdentitySettingsSection>
        <IdentitySettingsSection title="Admin event settings" description="Configure persistence of administrator actions.">
          <EmptyState title="Admin event settings not connected" description="Keycloak admin-event persistence settings are not available from the current frontend contract." />
        </IdentitySettingsSection>
      </div>
    )
  } else {
    const label = REALM_SETTING_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab
    content = <div className="p-4"><EmptyState title={label} description={`Keycloak realm ${label.toLowerCase()} settings are not connected yet.`} /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs
        items={REALM_SETTING_TABS}
        value={activeTab}
        onChange={onTabChange}
        ariaLabel="Realm settings sections"
        indicator="inset"
        scrollControls={{ previousLabel: 'Scroll Realm settings sections left', nextLabel: 'Scroll Realm settings sections right' }}
      />
      <div className="min-w-0">
        {content}
      </div>
    </IdentityContentPanel>
  )
}
