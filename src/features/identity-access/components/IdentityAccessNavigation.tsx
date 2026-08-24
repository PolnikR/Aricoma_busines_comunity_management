import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { Tabs } from '@/shared/components/tabs/Tabs'
import {
  getIdentityAccessGroup,
  getVisibleIdentityAccessSections,
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
  const visibleSections = getVisibleIdentityAccessSections(groupId)

  return (
    <nav aria-label="Keycloak realm navigation" className="min-w-0 border-b border-border bg-surface">
      <div className="px-4 py-3">
        <div className="w-fit max-w-full">
          <FilterTabs
            ariaLabel="Keycloak navigation groups"
            tabs={identityAccessSectionGroups.map(group => ({ value: group.id, label: group.label }))}
            value={groupId}
            onChange={(nextGroupId) => { onGroupChange(nextGroupId as IdentityAccessSectionGroupId) }}
          />
        </div>
      </div>

      <Tabs
        items={visibleSections.map(section => ({ value: section.id, label: section.label }))}
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
