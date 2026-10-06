import { DetailField, DetailStatusBlock } from '@/shared/components/detail-view'
import { useTranslation } from '@/hooks/useTranslation'
import { formatMetroMirrorState, metroMirrorSideLabel, metroMirrorStateTone } from '../helpers/metroMirrorPresentation'
import type { MetroMirrorStatusOutput } from '../helpers/metroMirrorPresentation'


function ProgressValue({ progress, label }: { progress: number; label: string }) {
  const value = Math.max(0, Math.min(100, progress))
  return (
    <span className="flex max-w-60 items-center gap-2">
      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span className="block h-full rounded-full bg-accent" style={{ width: `${String(value)}%` }} />
      </span>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{progress} %</span>
    </span>
  )
}

// Operational state of the Metro Mirror consistency group. Metro Mirror is collected
// best-effort: an error only replaces this block, never the rest of the inventory.
export function RecoveryGroupMetroMirrorStatus({ metroMirror }: { metroMirror: MetroMirrorStatusOutput }) {
  const { t } = useTranslation()
  const group = metroMirror.consistency_group
  const reference = metroMirror.queried_provider_id
    ? { label: t('recoveryInventory.metroMirror.queriedProvider'), value: metroMirror.queried_provider_id, copyValue: metroMirror.queried_provider_id }
    : undefined
  const mode = metroMirror.mode ? <DetailField label={t('recoveryInventory.metroMirror.mode')} value={formatMetroMirrorState(metroMirror.mode)} /> : null

  if (metroMirror.error) {
    return (
      <DetailStatusBlock title={t('recoveryInventory.metroMirror.consistencyGroup')} status={t('recoveryInventory.metroMirror.unavailable')} tone="warning" reference={reference}>
        <DetailField label={t('recoveryInventory.metroMirror.errorDetail')} value={metroMirror.error} secondary={t('recoveryInventory.metroMirror.bestEffort')} />
        {mode}
      </DetailStatusBlock>
    )
  }
  if (!group) return null

  const tone = metroMirrorStateTone(group.state)
  const mappingCount = metroMirror.mappings.length
  const progress = typeof group.progress === 'number' ? group.progress : null
  return (
    <DetailStatusBlock
      title={t('recoveryInventory.metroMirror.consistencyGroup')}
      status={group.state ? formatMetroMirrorState(group.state) : t('recoveryInventory.metroMirror.unknownState')}
      tone={tone}
      timestamp={<>
        <span className="font-semibold text-text-primary">{group.name ?? group.id}</span>
        {' '}<span className="font-mono text-xs text-text-subtle">#{group.id}</span>
      </>}
      reference={reference}
    >
      <DetailField
        label={t('recoveryInventory.metroMirror.progress')}
        value={progress !== null
          ? <ProgressValue progress={progress} label={t('recoveryInventory.metroMirror.progress')} />
          : <span className="text-text-subtle">{t(tone === 'success' ? 'recoveryInventory.metroMirror.inSync' : 'recoveryInventory.metroMirror.notReported')}</span>}
      />
      <DetailField label={t('recoveryInventory.metroMirror.primary')} value={group.primary ? metroMirrorSideLabel(group.primary, t) : null} />
      <DetailField
        label={t('recoveryInventory.metroMirror.relationships')}
        value={mappingCount === group.relationship_count
          ? String(group.relationship_count)
          : t('recoveryInventory.metroMirror.relationshipsOf', { count: mappingCount, total: group.relationship_count })}
      />
      {mode}
      {group.freeze_time ? <DetailField label={t('recoveryInventory.metroMirror.frozenAt')} value={group.freeze_time} mono /> : null}
    </DetailStatusBlock>
  )
}
