import { PageHeader } from '@/shared/components/page/PageHeader'
import { UsersSection } from '../components/UsersSection'
import { RealmRolesSection } from '../components/RealmRolesSection'
import { GroupsSection } from '../components/GroupsSection'
import { ClientsSection } from '../components/ClientsSection'
import { ClientScopesSection } from '../components/ClientScopesSection'
import { RealmSettingsSection } from '../components/RealmSettingsSection'
import { AuthenticationSection } from '../components/AuthenticationSection'
import { IdentityProvidersSection } from '../components/IdentityProvidersSection'
import { UserFederationSection } from '../components/UserFederationSection'
import { EventsSection } from '../components/EventsSection'
import { PermissionsSection } from '../components/PermissionsSection'
import { OrganizationsSection } from '../components/OrganizationsSection'
import { SessionsSection } from '../components/SessionsSection'
import { IdentityAccessNavigation } from '../components/IdentityAccessNavigation'
import { KeycloakPlaceholderSection } from '../components/KeycloakPlaceholderSection'
import { useIdentityAccessSection } from '../hooks/useIdentityAccessSection'
import { identityAccessSectionGroups, type IdentityAccessSectionId } from '../models/identityAccessSections'

const sectionLabels = new Map<IdentityAccessSectionId, string>(
  identityAccessSectionGroups.flatMap(group => group.sections.map(section => [section.id, section.label] as const)),
)

interface IdentityAccessSectionContentProps {
  sectionId: IdentityAccessSectionId
  entityId: string | null
  tabId: import('../models/identityAccessSections').IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: import('../models/identityAccessSections').IdentityAccessTabId) => void
  onOpenEventSettings: () => void
}

function IdentityAccessSectionContent({ sectionId, entityId, tabId, onEntityChange, onTabChange, onOpenEventSettings }: IdentityAccessSectionContentProps) {
  if (sectionId === 'users') return <UsersSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'realm-roles') return <RealmRolesSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'groups') return <GroupsSection />
  if (sectionId === 'clients') return <ClientsSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'client-scopes') return <ClientScopesSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'realm-settings') return <RealmSettingsSection tabId={tabId} onTabChange={onTabChange} />
  if (sectionId === 'authentication') return <AuthenticationSection tabId={tabId} onTabChange={onTabChange} />
  if (sectionId === 'identity-providers') return <IdentityProvidersSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'user-federation') return <UserFederationSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'events') return <EventsSection tabId={tabId} onTabChange={onTabChange} onOpenSettings={onOpenEventSettings} />
  if (sectionId === 'permissions') return <PermissionsSection />
  if (sectionId === 'organizations') return <OrganizationsSection />
  if (sectionId === 'sessions') return <SessionsSection />

  return <KeycloakPlaceholderSection title={sectionLabels.get(sectionId) ?? sectionId} />
}

export function IdentityAccessPage() {
  const { sectionId, groupId, entityId, tabId, setSectionId, setSectionTab, setGroupId, setEntityId, setTabId } = useIdentityAccessSection()

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageHeader
        eyebrow="Platform administration"
        title="Identity & Access"
        description="Manage Keycloak identities, applications, access policies, sessions, authentication, and realm configuration."
      />

      <div className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div
          data-testid="identity-access-realm-context"
          className="flex flex-col gap-1 border-b border-border bg-surface-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Realm</span>
            <span className="text-sm font-semibold text-text-primary">ABCO</span>
          </div>
          <span className="text-xs text-text-muted">Keycloak realm administration</span>
        </div>

        <IdentityAccessNavigation
          groupId={groupId}
          sectionId={sectionId}
          onGroupChange={setGroupId}
          onSectionChange={setSectionId}
        />
        <section className="min-w-0 flex-1 overflow-hidden bg-surface" aria-live="polite">
          <IdentityAccessSectionContent sectionId={sectionId} entityId={entityId} tabId={tabId} onEntityChange={setEntityId} onTabChange={setTabId} onOpenEventSettings={() => { setSectionTab('realm-settings', 'events') }} />
        </section>
      </div>
    </div>
  )
}
