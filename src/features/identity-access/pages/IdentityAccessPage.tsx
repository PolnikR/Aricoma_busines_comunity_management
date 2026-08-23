import { PageHeader } from '@/shared/components/page/PageHeader'
import { UsersSection } from '../components/UsersSection'
import { RealmRolesSection } from '../components/RealmRolesSection'
import { PermissionsSection } from '../components/PermissionsSection'
import { OrganizationsSection } from '../components/OrganizationsSection'
import { SessionsSection } from '../components/SessionsSection'
import { IdentityAccessNavigation } from '../components/IdentityAccessNavigation'
import { useIdentityAccessSection } from '../hooks/useIdentityAccessSection'
import { identityAccessSectionGroups, type IdentityAccessSectionId } from '../models/identityAccessSections'

const sectionLabels = new Map<IdentityAccessSectionId, string>(
  identityAccessSectionGroups.flatMap(group => group.sections.map(section => [section.id, section.label] as const)),
)

function IdentityAccessSectionContent({ sectionId }: { sectionId: IdentityAccessSectionId }) {
  if (sectionId === 'users') return <UsersSection />
  if (sectionId === 'realm-roles') return <RealmRolesSection />
  if (sectionId === 'permissions') return <PermissionsSection />
  if (sectionId === 'organizations') return <OrganizationsSection />
  if (sectionId === 'sessions') return <SessionsSection />

  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <h2 className="text-base font-semibold text-text-primary">{sectionLabels.get(sectionId)}</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">Keycloak integration for this section is not connected yet.</p>
    </div>
  )
}

export function IdentityAccessPage() {
  const { sectionId, setSectionId } = useIdentityAccessSection()

  return (
    <div className="flex min-h-full min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageHeader
        eyebrow="Platform administration"
        title="Identity & Access"
        description="Manage Keycloak identities, applications, access policies, sessions, authentication, and realm configuration."
      />

      <div className="grid min-h-[38rem] min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm md:grid-cols-[220px_minmax(0,1fr)]">
        <IdentityAccessNavigation sectionId={sectionId} onSectionChange={setSectionId} />
        <section className="min-w-0 overflow-hidden bg-surface p-4" aria-live="polite">
          <IdentityAccessSectionContent sectionId={sectionId} />
        </section>
      </div>
    </div>
  )
}
