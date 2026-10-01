import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
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
import type { IdentityAccessSectionId } from '../models/identityAccessSections'

interface SectionActionContext {
  sectionId: IdentityAccessSectionId
  entityId: string | null
  tabId: import('../models/identityAccessSections').IdentityAccessTabId | null
  onOpenEventSettings: () => void
  t: ReturnType<typeof useTranslation>['t']
}

function getSectionAction({ sectionId, entityId, tabId, onOpenEventSettings, t }: SectionActionContext) {
  if (entityId) return null

  // Preserve top-level section actions so later agents can safely remove duplicate IdentityResourceHeader actions.
  switch (sectionId) {
    case 'realm-roles':
      return <Button size="sm" disabled title={t('identity.actions.requires.keycloak')}>{t('identity.actions.createRole')}</Button>
    case 'client-scopes':
      return <Button size="sm" disabled title={t('identity.actions.requires.clientScopes')}>{t('identity.actions.createClientScope')}</Button>
    case 'organizations':
      return <Button size="sm" disabled title={t('identity.actions.requires.organizations')}>{t('identity.actions.createOrganization')}</Button>
    case 'groups':
      return <Button size="sm" disabled title={t('identity.actions.requires.groups')}>{t('identity.actions.createGroup')}</Button>
    case 'sessions':
      return <Button size="sm" variant="danger" disabled title={t('identity.actions.requires.sessions')}>{t('identity.actions.signOutAllSessions')}</Button>
    case 'events':
      return <Button size="sm" variant="outline" onClick={onOpenEventSettings}>{t('identity.actions.eventSettings')}</Button>
    case 'authentication':
      return tabId === 'flows' ? <Button size="sm" disabled title={t('identity.actions.requires.authentication')}>{t('identity.actions.createFlow')}</Button> : null
    case 'user-federation':
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled title={t('identity.actions.requires.federation')}>{t('identity.actions.addLdap')}</Button>
          <Button size="sm" variant="outline" disabled title={t('identity.actions.requires.federation')}>{t('identity.actions.addKerberos')}</Button>
        </div>
      )
    // users (managed in Keycloak), identity-providers, permissions, and other sections intentionally have no top-level action
    default:
      return null
  }
}

interface IdentityAccessSectionContentProps {
  sectionId: IdentityAccessSectionId
  entityId: string | null
  tabId: import('../models/identityAccessSections').IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: import('../models/identityAccessSections').IdentityAccessTabId) => void
  onOpenEventSettings: () => void
}

function IdentityAccessSectionContent({ sectionId, entityId, tabId, onEntityChange, onTabChange, onOpenEventSettings }: IdentityAccessSectionContentProps) {
  const { t } = useTranslation()
  if (sectionId === 'users') return <UsersSection />
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
  if (sectionId === 'organizations') return <OrganizationsSection entityId={entityId} tabId={tabId} onEntityChange={onEntityChange} onTabChange={onTabChange} />
  if (sectionId === 'sessions') return <SessionsSection />

  return <KeycloakPlaceholderSection title={t(`identity.navigation.sections.${sectionId}`)} />
}

export function IdentityAccessPage() {
  const { t } = useTranslation()
  const { sectionId, groupId, entityId, tabId, setSectionId, setSectionTab, setEntityId, setTabId } = useIdentityAccessSection()

  return (
    <div className="flex min-h-full min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('identity.page.eyebrow')}
        title={t('identity.page.title')}
        description={t('identity.page.description')}
        actions={getSectionAction({
          sectionId,
          entityId,
          tabId,
          onOpenEventSettings: () => { setSectionTab('realm-settings', 'events') },
          t,
        })}
      />

      <InventoryShell
        inventoryTitle={t('identity.navigation.title')}
        tabs={(
          <IdentityAccessNavigation
            groupId={groupId}
            sectionId={sectionId}
            onSectionChange={setSectionId}
          />
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-live="polite">
          <IdentityAccessSectionContent
            sectionId={sectionId}
            entityId={entityId}
            tabId={tabId}
            onEntityChange={setEntityId}
            onTabChange={setTabId}
            onOpenEventSettings={() => { setSectionTab('realm-settings', 'events') }}
          />
        </div>
      </InventoryShell>
    </div>
  )
}
