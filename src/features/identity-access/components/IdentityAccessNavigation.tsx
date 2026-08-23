import { identityAccessSectionGroups, type IdentityAccessSectionId } from '../models/identityAccessSections'

interface IdentityAccessNavigationProps {
  sectionId: IdentityAccessSectionId
  onSectionChange: (sectionId: IdentityAccessSectionId) => void
}

export function IdentityAccessNavigation({ sectionId, onSectionChange }: IdentityAccessNavigationProps) {
  return (
    <aside className="min-w-0 border-b border-border bg-surface-subtle md:border-b-0 md:border-r">
      <div className="border-b border-border px-3 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle">Realm</p>
        <div className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-xs font-semibold text-text-primary shadow-sm">
          ABCO
        </div>
        <p className="mt-2 text-[10px] text-text-muted">Keycloak realm administration</p>
      </div>

      <nav aria-label="Keycloak realm navigation" className="space-y-4 p-2.5">
        {identityAccessSectionGroups.map(group => (
          <section key={group.id} aria-labelledby={`identity-access-${group.id}`}>
            <h2
              id={`identity-access-${group.id}`}
              className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-subtle"
            >
              {group.label}
            </h2>
            <div className="space-y-0.5">
              {group.sections.map(section => {
                const isActive = section.id === sectionId
                return (
                  <button
                    key={section.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { onSectionChange(section.id) }}
                    className={`flex min-h-8 w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 ${
                      isActive
                        ? 'bg-accent-soft text-accent shadow-[inset_3px_0_0_var(--color-accent)]'
                        : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                    }`}
                  >
                    {section.label}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  )
}
