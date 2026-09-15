import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { useRecoveryGroupInventory } from '../hooks/useRecoveryGroups'

interface RecoveryGroupInventoryProps {
  runId: string | null
  active: boolean
}

function providerObjectLabel(value: Record<string, unknown>): string {
  for (const key of ['name', 'volume_name', 'vdisk_name', 'id', 'uid']) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return '—'
}

export function RecoveryGroupInventory({ runId, active }: RecoveryGroupInventoryProps) {
  const { t } = useTranslation()
  const query = useRecoveryGroupInventory(runId, active)

  if (!runId) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.noRun')}</p>
  if (query.isLoading) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.loading')}</p>
  if (query.error) {
    return <FetchErrorAlert className="m-5" title={t('recoveryInventory.error')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} />
  }
  if (!query.data) return null

  const volumes = Object.entries(query.data.volumes)
  const foundCount = volumes.filter(([, volume]) => volume.found).length
  const relationCount = volumes.reduce((total, [, volume]) => total + volume.relations.length, 0)

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{query.data.recovery_group_name}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-text-subtle">{query.data.recovery_group_id} · {query.data.run_id}</p>
          </div>
          <Badge color={foundCount === volumes.length ? 'success' : 'warning'} size="sm">
            {foundCount}/{volumes.length} {t('recoveryInventory.found').toLowerCase()}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [t('recoveryInventory.volumes'), volumes.length],
            [t('recoveryInventory.found'), foundCount],
            [t('recoveryInventory.relations'), relationCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-2.5 py-2">
              <strong className="block text-base text-text-primary">{value}</strong>
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-subtle">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
        {t('recoveryInventory.volumeInventory')} · {query.data.provider_id_volume ?? '—'}
      </p>
      {volumes.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : volumes.map(([name, volume]) => (
        <details key={name} className="group overflow-hidden rounded-lg border border-border bg-surface">
          <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-3 marker:hidden">
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{name}</span>
              <span className="text-[11px] text-text-subtle">{volume.relations.length} {t('recoveryInventory.mappingRelations')}</span>
            </div>
            <Badge color={volume.found ? 'success' : 'error'} size="sm">{t(volume.found ? 'recoveryInventory.found' : 'recoveryInventory.notFound')}</Badge>
            <ChevronDownIcon className="size-4 text-text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-border bg-surface-subtle px-3 py-3">
            {volume.relations.length === 0 ? <p className="text-xs text-text-subtle">{t('recoveryInventory.noRelations')}</p> : volume.relations.map((relation, index) => {
              const pairedName = providerObjectLabel(relation.paired_volume)
              const sourceName = relation.role === 'source' ? name : pairedName
              const targetName = relation.role === 'target' ? name : pairedName
              return (
                <div key={`${relation.role}-${String(index)}`} className="grid grid-cols-[minmax(0,1fr)_1.5rem_minmax(0,1fr)] items-center gap-1.5">
                  <div className="min-w-0 rounded-md border border-border bg-surface px-2.5 py-2">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-text-subtle">{t('recoveryInventory.sourceVolume')}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-text-primary">{sourceName}</span>
                  </div>
                  <span className="text-center text-sm font-bold text-accent" aria-hidden="true">→</span>
                  <div className="min-w-0 rounded-md border border-border bg-surface px-2.5 py-2">
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-text-subtle">{t('recoveryInventory.targetVolume')}</span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-text-primary">{targetName}</span>
                  </div>
                </div>
              )
            })}
            <div aria-label={t('recoveryInventory.showTechnicalJson')}>
              <ResponseBodyViewer data={volume} defaultOpen={false} />
            </div>
          </div>
        </details>
      ))}
    </div>
  )
}
