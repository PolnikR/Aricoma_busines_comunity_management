import { SkeletonBlock } from './SkeletonBlock'

// Placeholder shown in the VM filter modal while filter options (providers)
// are loading.
import { useTranslation } from '@/hooks/useTranslation'

export function FilterPanelSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('common.loadingFilters')}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      ))}
    </div>
  )
}
