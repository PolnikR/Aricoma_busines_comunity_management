import type { VmwareProviderFilter } from '../../helpers/vmwareProviderFilter'

interface VmwareProviderFilterSummaryProps {
  filter: VmwareProviderFilter
  label: string
  nameLabel: string
  tagLabel: string
}

export function VmwareProviderFilterSummary({ filter, label, nameLabel, tagLabel }: VmwareProviderFilterSummaryProps) {
  if (!filter.isFixed) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted" role="group" aria-label={label}>
      <span aria-hidden="true" className="font-medium text-text-secondary">▼ {label}:</span>
      {filter.prefix ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-text-secondary">
          {nameLabel} <strong className="font-semibold text-text-primary">{filter.prefix}*</strong>
        </span>
      ) : null}
      {filter.tag ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-text-secondary">
          {tagLabel} <strong className="font-semibold text-text-primary">{filter.tag}</strong>
        </span>
      ) : null}
    </div>
  )
}
