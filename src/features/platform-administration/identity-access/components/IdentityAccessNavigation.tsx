import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
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
  const { t } = useTranslation()
  const activeGroup = getIdentityAccessGroup(groupId)
  const visibleSections = getVisibleIdentityAccessSections(groupId)
  const activeGroupLabel = t(`identity.navigation.groups.${activeGroup.id}`)

  return (
    <nav aria-label={t('identity.navigation.ariaLabel')} className="min-w-0 border-b border-border bg-surface">
      <div className="px-4 py-3">
        <div className="w-fit max-w-full">
          <FilterTabs
            ariaLabel={t('identity.navigation.groups.ariaLabel')}
            tabs={identityAccessSectionGroups.map(group => ({ value: group.id, label: t(`identity.navigation.groups.${group.id}`) }))}
            value={groupId}
            onChange={(nextGroupId) => { onGroupChange(nextGroupId as IdentityAccessSectionGroupId) }}
          />
        </div>
      </div>

      <Tabs
        items={visibleSections.map(section => ({ value: section.id, label: t(`identity.navigation.sections.${section.id}`) }))}
        value={sectionId}
        onChange={onSectionChange}
        ariaLabel={t('identity.navigation.sections.ariaLabel', { group: activeGroupLabel })}
        indicator="inset"
        className="px-2 sm:px-3"
        scrollControls={{
          previousLabel: t('identity.navigation.scroll.previous', { group: activeGroupLabel }),
          nextLabel: t('identity.navigation.scroll.next', { group: activeGroupLabel }),
        }}
      />
    </nav>
  )
}
