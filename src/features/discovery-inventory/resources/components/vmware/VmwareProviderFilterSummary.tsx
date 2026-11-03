import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1100)
  const summaryRef = useRef<HTMLDivElement>(null)
  const restoreSummaryFocus = useRef(false)
  const tags = filter.filters.tags
  const visibleTagCount = isNarrow ? 1 : 2
  const hiddenTagCount = Math.max(0, tags.length - visibleTagCount)

  useEffect(() => {
    const onResize = () => {
      const nextIsNarrow = window.innerWidth < 1100
      const active = document.activeElement
      restoreSummaryFocus.current = Boolean(nextIsNarrow && active && active === summaryRef.current?.querySelector('[data-provider-tag-index="1"]'))
      // The only disappearing trigger is the two-tag narrow scope. Preserve focus
      // from that trigger or its portaled panel, without moving external focus.
      if (!nextIsNarrow && tags.length === 2) {
        const trigger = summaryRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')
        const panelId = trigger?.getAttribute('aria-controls')
        const panel = panelId ? document.getElementById(panelId) : null
        restoreSummaryFocus.current = Boolean(trigger && (active === trigger || (active && panel?.contains(active))))
      }
      setIsNarrow(nextIsNarrow)
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize) }
  }, [tags.length])

  useLayoutEffect(() => {
    if (restoreSummaryFocus.current) {
      restoreSummaryFocus.current = false
      summaryRef.current?.focus()
    }
  }, [isNarrow])

  if (!filter.prefix && tags.length === 0) return null

  return (
    <div
      ref={summaryRef}
      role="group"
      aria-label={label}
      tabIndex={-1}
      data-provider-scope={providerId ?? ''}
      className="ml-auto flex min-w-0 max-w-full items-center justify-end gap-1 text-[11px] text-text-secondary sm:gap-2 min-[1100px]:max-w-[17rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
    >
      <svg aria-hidden="true" className="hidden size-3 shrink-0 text-text-muted sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      {filter.prefix ? (
        <span className="flex min-w-0 flex-1 items-center sm:gap-1">
          <span className="sr-only shrink-0 whitespace-nowrap text-text-muted sm:not-sr-only sm:whitespace-nowrap">{nameLabel}</span>
          <span
            role="region"
            aria-label={nameLabel}
            tabIndex={0}
            className="custom-scrollbar min-w-0 overflow-x-auto whitespace-nowrap rounded-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
          >{filter.prefix}</span>
        </span>
      ) : null}
      {tags.length > 0 ? (
        <span className="flex min-w-0 flex-1 items-center sm:gap-1">
          <span className="sr-only shrink-0 whitespace-nowrap text-text-muted sm:not-sr-only sm:whitespace-nowrap">{tagLabel}</span>
          {tags.slice(0, visibleTagCount).map((tag, index) => (
            <span
              key={tag}
              data-provider-tag-index={index}
              role="region"
              aria-label={tagLabel}
              tabIndex={0}
              className="custom-scrollbar min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-sm font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
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
