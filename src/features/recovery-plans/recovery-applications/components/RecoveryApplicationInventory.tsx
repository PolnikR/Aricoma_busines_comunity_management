import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { useTranslation } from '@/hooks/useTranslation'
import { useRecoveryApplicationInventory } from '../hooks/useRecoveryApplications'

interface RecoveryApplicationInventoryProps {
  runId: string | null
  active: boolean
}

export function RecoveryApplicationInventory({ runId, active }: RecoveryApplicationInventoryProps) {
  const { t } = useTranslation()
  const query = useRecoveryApplicationInventory(runId, active)

  if (!runId) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.noRun')}</p>
  if (query.isLoading) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.loading')}</p>
  if (query.error) {
    return <FetchErrorAlert className="m-5" title={t('recoveryInventory.error')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} />
  }
  if (!query.data) return null

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="font-semibold text-text-primary">{query.data.recovery_app_name}</p>
        <p className="mt-1 font-mono text-xs text-text-subtle">{query.data.recovery_app_id} · {query.data.run_id}</p>
      </div>
      {query.data.tiers.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : query.data.tiers.map(tier => (
        <section key={`${tier.tier_name}-${tier.recovery_group_id}`} className="space-y-3 rounded-lg border border-border p-3">
          <div>
            <h3 className="font-semibold text-text-primary">{tier.tier_name}</h3>
            <p className="text-xs text-text-subtle">{tier.recovery_group_name} · {tier.recovery_group_id}</p>
            {tier.provider_id_vm ? <p className="mt-1 font-mono text-xs text-text-subtle">{tier.provider_id_vm}</p> : null}
          </div>
          {tier.vms.map(vm => (
            <div key={vm.name} className="space-y-2 rounded-md bg-surface-muted p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-text-primary">{vm.name}</span>
                <Badge color={vm.found ? 'success' : 'error'} size="sm">{t(vm.found ? 'recoveryInventory.found' : 'recoveryInventory.notFound')}</Badge>
              </div>
              <p className="text-xs text-text-subtle">{t('recoveryInventory.datastores')}: {vm.datastores.join(', ') || '—'}</p>
              {vm.error ? <p className="text-xs text-error-700">{vm.error}</p> : null}
              <ResponseBodyViewer data={vm} defaultOpen={false} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
