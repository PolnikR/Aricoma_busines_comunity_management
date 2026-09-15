import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { useTranslation } from '@/hooks/useTranslation'
import { useRecoveryGroupInventory } from '../hooks/useRecoveryGroups'

interface RecoveryGroupInventoryProps {
  runId: string | null
  active: boolean
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
  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold text-text-primary">{query.data.recovery_group_name}</p>
        <p className="mt-1 font-mono text-xs text-text-subtle">{query.data.recovery_group_id} · {query.data.run_id}</p>
        <p className="mt-1 font-mono text-xs text-text-subtle">{query.data.provider_id_volume ?? '—'}</p>
      </div>
      {volumes.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : volumes.map(([name, volume]) => (
        <section key={name} className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-text-primary">{name}</h3>
            <Badge color={volume.found ? 'success' : 'error'} size="sm">{t(volume.found ? 'recoveryInventory.found' : 'recoveryInventory.notFound')}</Badge>
          </div>
          {volume.relations.map((relation, index) => (
            <div key={`${relation.role}-${String(index)}`} className="space-y-2 rounded-md bg-surface-muted p-3 text-sm">
              <Badge color={relation.role === 'source' ? 'info' : 'success'} size="sm">{relation.role}</Badge>
              <p className="text-xs text-text-subtle">{t('recoveryInventory.pairedVolume')}</p>
              <ResponseBodyViewer data={{ mapping: relation.mapping, paired_volume: relation.paired_volume, consistency_group: relation.consistency_group }} defaultOpen={false} />
            </div>
          ))}
          <ResponseBodyViewer data={volume} defaultOpen={false} />
        </section>
      ))}
    </div>
  )
}
