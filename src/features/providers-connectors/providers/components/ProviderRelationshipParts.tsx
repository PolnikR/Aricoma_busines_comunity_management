import { Badge } from '@/shared/components/badge/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/shared/utils/cn'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { PartnerDirection } from '../helpers/buildRelationshipRows'
import type { ProviderRecord } from '../model/providerTypes'

// Building blocks of the relationship rows (approved template v2). Layout classes
// switch from a vertical stack to left-to-right rows once the `relationships`
// container is wide enough.

export function ProviderRelationshipCard({ provider }: { provider: ProviderRecord }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface px-2.5 py-1.5">
      <span className="block truncate text-[13px] font-semibold leading-[18px] text-text-primary" title={provider.name}>{provider.name}</span>
      <span className="flex items-center gap-1.5 text-[11.5px] leading-[18px] text-text-muted">
        {providerTypeLabel(provider.type)}
        <Badge color={provider.role === 'target' ? 'warning' : 'success'} size="sm">{t(`forms.role.${provider.role}`)}</Badge>
      </span>
      <span className="block truncate font-mono text-[10.5px] leading-[15px] text-text-subtle">{provider.id}</span>
    </div>
  )
}

export function UnavailableProviderCard({ id }: { id: string }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 rounded-lg border border-dashed border-border-strong bg-surface-subtle px-2.5 py-1.5">
      <span className="block truncate font-mono text-xs font-medium leading-[18px] text-text-secondary" title={id}>{id}</span>
      <span className="flex items-center text-[11.5px] leading-[18px]">
        <Badge color="light" size="sm">{t('providers.relationships.unavailable')}</Badge>
      </span>
      <span className="block truncate text-[10.5px] leading-[15px] text-text-subtle">{t('providers.relationships.unavailableHint')}</span>
    </div>
  )
}

export function MismatchPill() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex shrink-0 rounded-full border border-border-strong px-1.5 text-[10px] font-medium leading-[14px] text-text-muted">
      {t('providers.relationships.mismatch')}
    </span>
  )
}

const PARTNER_SR_KEY: Record<PartnerDirection, string> = {
  both: 'providers.relationships.sr.mutualPartner',
  out: 'providers.relationships.sr.partnerOf',
  in: 'providers.relationships.sr.partneredBy',
}

interface RelationshipConnectorProps {
  kind: 'backing' | 'partner'
  direction?: PartnerDirection
  mismatch?: boolean
}

// Label above a line with arrow tips; color carries the kind, text carries the meaning.
export function RelationshipConnector({ kind, direction = 'out', mismatch = false }: RelationshipConnectorProps) {
  const { t } = useTranslation()
  const tipRight = direction !== 'in'
  const tipLeft = direction !== 'out'
  return (
    <div
      className={cn(
        'relative flex h-6 items-center pl-6',
        '@min-[47.5rem]/relationships:h-[3.875rem] @min-[47.5rem]/relationships:items-end @min-[47.5rem]/relationships:justify-center @min-[47.5rem]/relationships:pb-[2.0625rem] @min-[47.5rem]/relationships:pl-0',
        kind === 'backing' ? 'text-accent' : 'text-warning-600 dark:text-orange-400',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-3 border-l-[1.5px] border-current',
          '@min-[47.5rem]/relationships:inset-x-2 @min-[47.5rem]/relationships:inset-y-auto @min-[47.5rem]/relationships:top-[1.9375rem] @min-[47.5rem]/relationships:border-t-[1.5px] @min-[47.5rem]/relationships:border-l-0',
          mismatch && 'border-dashed',
        )}
      />
      {tipRight ? <span aria-hidden="true" className="absolute top-[1.9375rem] right-1 hidden -translate-y-[45%] border-y-4 border-l-[6px] border-y-transparent border-l-current @min-[47.5rem]/relationships:block" /> : null}
      {tipLeft ? <span aria-hidden="true" className="absolute top-[1.9375rem] left-1 hidden -translate-y-[45%] border-y-4 border-r-[6px] border-y-transparent border-r-current @min-[47.5rem]/relationships:block" /> : null}
      <span className="relative inline-flex items-center gap-1 px-1 text-[10.5px] font-semibold whitespace-nowrap">
        <span aria-hidden="true">{t(kind === 'backing' ? 'providers.relationships.backingStorage' : 'providers.relationships.partner')}</span>
        <span className="sr-only">{t(kind === 'backing' ? 'providers.relationships.sr.backing' : PARTNER_SR_KEY[direction])}</span>
        {mismatch ? <MismatchPill /> : null}
      </span>
    </div>
  )
}
