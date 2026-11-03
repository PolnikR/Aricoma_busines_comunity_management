import { useTranslation } from '@/hooks/useTranslation'
import { HelpPopover } from '@/shared/components/help-popover/HelpPopover'
import type { VmwareProviderFilter } from '../../helpers/vmwareProviderFilter'

interface VmwareProviderFilterSummaryProps {
  filter: VmwareProviderFilter
  label: string
  nameLabel: string
  tagLabel: string
  providerId?: string
}

export function VmwareProviderFilterSummary({ filter, label, nameLabel, tagLabel, providerId }: VmwareProviderFilterSummaryProps) {
  const { t } = useTranslation()
  const tags = filter.filters.tags
  const visibleTagCount = 1
  const hiddenTagCount = Math.max(0, tags.length - visibleTagCount)

  if (!filter.prefix && tags.length === 0) return null

  return (
    <div
      role="group"
      aria-label={label}
      tabIndex={-1}
      data-provider-scope={providerId ?? ''}
      className="ml-auto flex min-w-0 max-w-full items-center justify-end gap-1 text-[11px] text-text-secondary sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
    >
      <svg aria-hidden="true" className="hidden size-3 shrink-0 text-text-muted sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      {filter.prefix ? (
        <span className={`flex min-w-0 shrink-0 items-center sm:gap-1 ${tags.length > 0 ? 'max-w-[45%]' : 'max-w-full'}`}>
          <span className="sr-only shrink-0 whitespace-nowrap text-text-muted sm:not-sr-only sm:whitespace-nowrap">{nameLabel}</span>
          <span
            role="region"
            aria-label={nameLabel}
            tabIndex={0}
            className="min-w-0 whitespace-normal [overflow-wrap:anywhere] rounded-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
          >{filter.prefix}</span>
        </span>
      ) : null}
      {tags.length > 0 ? (
        <span className="flex min-w-0 flex-initial items-center sm:gap-1">
          <span className="sr-only shrink-0 whitespace-nowrap text-text-muted sm:not-sr-only sm:whitespace-nowrap">{tagLabel}</span>
          {tags.slice(0, visibleTagCount).map((tag, index) => (
            <span
              key={tag}
              data-provider-tag-index={index}
              role="region"
              aria-label={tagLabel}
              tabIndex={0}
              className="min-w-0 whitespace-normal [overflow-wrap:anywhere] rounded-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
            >{tag}</span>
          ))}
        </span>
      ) : null}
      {hiddenTagCount > 0 ? (
        <HelpPopover
          key={providerId}
          triggerContent={`+${String(hiddenTagCount)}`}
          triggerLabel={t('pages.virtualMachines.inventory.showAllTags', { count: tags.length })}
          title={t('pages.virtualMachines.inventory.allTags', { count: tags.length })}
          closeLabel={t('help.close')}
        >
          <ul className="space-y-1">
            {tags.map(tag => <li key={tag} className="whitespace-normal [overflow-wrap:anywhere]">{tag}</li>)}
          </ul>
        </HelpPopover>
      ) : null}
    </div>
  )
}
