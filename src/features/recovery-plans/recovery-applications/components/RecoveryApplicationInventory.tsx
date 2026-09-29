import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetRecoveryAppInventory } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { selectRecoveryApplicationInventory } from '../model/selectRecoveryApplications'

interface RecoveryApplicationInventoryProps {
  runId: string | null
  active: boolean
}

export function RecoveryApplicationInventory({ runId, active }: RecoveryApplicationInventoryProps) {
  const { t } = useTranslation()
  // compute_provider_id is intentionally not sent (backend default target vCenter):
  // a recovery application does not store the compute provider of its run.
  const query = useGetRecoveryAppInventory(
    { run_id: runId ?? '' },
    { query: { select: selectRecoveryApplicationInventory, enabled: active && Boolean(runId) } },
  )

  if (!runId) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.noRun')}</p>
  if (query.isLoading) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.loading')}</p>
  if (query.error) {
    return <FetchErrorAlert className="m-5" title={t('recoveryInventory.error')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} />
  }
  if (!query.data) return null

  const vmCount = query.data.tiers.reduce((total, tier) => total + tier.vms.length, 0)
  const foundCount = query.data.tiers.reduce((total, tier) => total + tier.vms.filter(vm => vm.found).length, 0)

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{query.data.recovery_app_name}</p>
            <p className="mt-1 truncate font-mono text-[11px] text-text-subtle">{query.data.recovery_app_id} · {query.data.run_id} · {query.data.compute_provider_id}</p>
          </div>
          <Badge color={foundCount === vmCount ? 'success' : 'warning'} size="sm">
            {foundCount}/{vmCount} {t('recoveryInventory.found').toLowerCase()}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [t('recoveryInventory.tiers'), query.data.tiers.length],
            [t('recoveryInventory.virtualMachines'), vmCount],
            [t('recoveryInventory.found'), foundCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-2.5 py-2">
              <strong className="block text-base text-text-primary">{value}</strong>
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-subtle">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{t('recoveryInventory.recoveredDatastores')}</p>
      {query.data.recovered_datastores.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : (
        <div className="space-y-2">
          {query.data.recovered_datastores.map(datastore => (
            <div key={datastore.datastore} className="rounded-md border border-border bg-surface px-2.5 py-2">
              <span className="block truncate text-xs font-semibold text-text-primary">{datastore.datastore}</span>
              <p className="mt-1 truncate font-mono text-[10px] text-text-subtle">{t('recoveryInventory.targetVolume')}: {datastore.target_vdisk ?? '—'}</p>
              <p className="mt-1 truncate text-[10px] text-text-subtle">{t('recoveryInventory.virtualMachines')}: {datastore.vms.join(', ') || '—'}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{t('recoveryInventory.tierInventory')}</p>
      {query.data.tiers.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : query.data.tiers.map(tier => {
        const tierFoundCount = tier.vms.filter(vm => vm.found).length
        return (
          <details key={`${tier.tier_name}-${tier.recovery_group_id}`} className="group overflow-hidden rounded-lg border border-border bg-surface">
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-3 marker:hidden">
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">{tier.tier_name}</span>
                <span className="block truncate text-[11px] text-text-subtle">{tier.recovery_group_name} · {tier.vms.length} {t('recoveryInventory.virtualMachines').toLowerCase()}</span>
              </div>
              <Badge color={tierFoundCount === tier.vms.length ? 'success' : 'warning'} size="sm">{tierFoundCount}/{tier.vms.length}</Badge>
              <ChevronDownIcon className="size-4 text-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-border bg-surface-subtle px-3 py-3">
              {tier.vms.map(vm => (
                <div key={vm.name} className="rounded-md border border-border bg-surface px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-text-primary">{vm.name}</span>
                    <Badge color={vm.found ? 'success' : 'error'} size="sm">{t(vm.found ? 'recoveryInventory.found' : 'recoveryInventory.notFound')}</Badge>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-text-subtle">{t('recoveryInventory.datastores')}: {vm.datastores.join(', ') || '—'}</p>
                </div>
              ))}
              <div aria-label={t('recoveryInventory.showTechnicalJson')}>
                <ResponseBodyViewer data={tier} defaultOpen={false} />
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
