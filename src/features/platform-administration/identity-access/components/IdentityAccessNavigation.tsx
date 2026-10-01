import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import {
  getIdentityAccessGroup,
  getVisibleIdentityAccessSections,
  type IdentityAccessSectionGroupId,
  type IdentityAccessSectionId,
} from '../models/identityAccessSections'

interface IdentityAccessNavigationProps {
  groupId: IdentityAccessSectionGroupId
  sectionId: IdentityAccessSectionId
  onSectionChange: (sectionId: IdentityAccessSectionId) => void
}

export function IdentityAccessNavigation({
  groupId,
  sectionId,
  onSectionChange,
}: IdentityAccessNavigationProps) {
  const { t } = useTranslation()
  const activeGroup = getIdentityAccessGroup(groupId)
  const visibleSections = getVisibleIdentityAccessSections(groupId)
  const activeGroupLabel = t(`identity.navigation.groups.${activeGroup.id}`)

  return (
    <nav aria-label={t('identity.navigation.ariaLabel')} className="w-full min-w-0 sm:w-auto">
      <Tabs
        items={visibleSections.map(section => ({ value: section.id, label: t(`identity.navigation.sections.${section.id}`) }))}
        value={sectionId}
        onChange={onSectionChange}
        ariaLabel={t('identity.navigation.sections.ariaLabel', { group: activeGroupLabel })}
        indicator="inset"
        compact
        className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"
        scrollControls={{
          previousLabel: t('identity.navigation.scroll.previous', { group: activeGroupLabel }),
          nextLabel: t('identity.navigation.scroll.next', { group: activeGroupLabel }),
        }}
      />
    </nav>
  )
}
