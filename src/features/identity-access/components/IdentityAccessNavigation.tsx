import { Tabs } from '@/shared/components/tabs/Tabs'
import {
  getIdentityAccessGroup,
  identityAccessSectionGroups,
  type IdentityAccessSectionGroupId,
  type IdentityAccessSectionId,
} from '../models/identityAccessSections'

interface IdentityAccessNavigationProps {
  groupId: IdentityAccessSectionGroupId
  sectionId: IdentityAccessSectionId
  onGroupChange: (groupId: IdentityAccessSectionGroupId) => void
  onSectionChange: (sectionId: IdentityAccessSectionId) => void
}

export function IdentityAccessNavigation({
  groupId,
  sectionId,
  onGroupChange,
  onSectionChange,
}: IdentityAccessNavigationProps) {
  const activeGroup = getIdentityAccessGroup(groupId)

  return (
    <nav aria-label="Keycloak realm navigation" className="min-w-0 border-b border-border bg-surface">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Keycloak navigation groups"
          className="flex h-10 w-fit max-w-full overflow-x-auto rounded-xl bg-surface-muted p-0.5"
        >
          {identityAccessSectionGroups.map(group => {
            const isActive = group.id === groupId
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => { onGroupChange(group.id) }}
                className={`shrink-0 rounded-[10px] px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 ${
                  isActive
                    ? 'bg-surface text-accent shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {group.label}
              </button>
            )
          })}
        </div>
        <span className="text-xs text-text-muted">Keycloak administration</span>
      </div>

      <Tabs
        items={activeGroup.sections.map(section => ({ value: section.id, label: section.label }))}
        value={sectionId}
        onChange={onSectionChange}
        ariaLabel={`${activeGroup.label} sections`}
        indicator="inset"
        className="px-2 sm:px-3"
        scrollControls={{
          previousLabel: `Scroll ${activeGroup.label} sections left`,
          nextLabel: `Scroll ${activeGroup.label} sections right`,
        }}
      />
    </nav>
  )
}
