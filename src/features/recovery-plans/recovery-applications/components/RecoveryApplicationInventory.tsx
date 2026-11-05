import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetRecoveryAppInventory } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { selectRecoveryApplicationInventory } from '../model/selectRecoveryApplications'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { targetComputeProviderIdOf } from '../hooks/useDeleteRecoveryApplication'
import { RecoveryApplicationVmwareInventory } from './RecoveryApplicationVmwareInventory'
import { RecoveryApplicationPowerInventory } from './RecoveryApplicationPowerInventory'

interface RecoveryApplicationInventoryProps {
  runId: string | null
  active: boolean
  application: RecoveryApplicationListItem
}

function resolveInventoryTarget(
  application: RecoveryApplicationListItem,
): { computeProviderId: string | null; error: Error | null } {
  try {
    return { computeProviderId: targetComputeProviderIdOf(application), error: null }
  } catch (error) {
    return { computeProviderId: null, error: error instanceof Error ? error : new Error(String(error)) }
  }
}

export function RecoveryApplicationInventory({ runId, active, application }: RecoveryApplicationInventoryProps) {
  const { t } = useTranslation()
  const target = resolveInventoryTarget(application)
  const query = useGetRecoveryAppInventory(
    { run_id: runId ?? '', ...(target.computeProviderId ? { compute_provider_id: target.computeProviderId } : {}) },
    {
      query: {
        select: selectRecoveryApplicationInventory,
        enabled: active && Boolean(runId) && Boolean(target.computeProviderId),
      },
    },
  )

  if (!runId) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.noRun')}</p>
  if (target.error) return <Alert className="m-5" variant="error" title={t('recoveryInventory.error')} description={target.error.message} />
  if (query.isLoading) return <p className="px-5 py-6 text-sm text-text-subtle">{t('recoveryInventory.loading')}</p>
  if (query.error && !query.data) {
    return <FetchErrorAlert className="m-5" title={t('recoveryInventory.error')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} />
  }
  if (!query.data) return null

  const vmCount = query.data.tiers.reduce((total, tier) => total + tier.vms.length, 0)
  const foundCount = query.data.tiers.reduce((total, tier) => total + tier.vms.filter(vm => vm.found).length, 0)
  const isPower = query.data.platform === 'ibm_power'
  const hasOwnershipWarning = isPower && query.data.tiers.some(tier => tier.vms.some(vm => Boolean(vm.other_hosts?.length)))
  const metrics = [
    [t('recoveryInventory.tiers'), query.data.tiers.length],
    [t(isPower ? 'recoveryInventory.power.lpars' : 'recoveryInventory.virtualMachines'), vmCount],
    [t(isPower ? 'recoveryInventory.power.found' : 'recoveryInventory.found'), foundCount],
    ...(isPower ? [
      [t('recoveryInventory.power.hosts'), query.data.recovered_hosts.length],
      [t('recoveryInventory.power.mappedVolumes'), query.data.recovered_hosts.reduce((total, host) => total + host.volumes.length, 0)],
    ] : []),
  ]

  return (
    <div className="min-w-0 space-y-4 px-5 py-4">
      {query.error ? <FetchErrorAlert title={t('recoveryInventory.refreshFailed')} retryLabel={t('buttons.retry')} isRetrying={query.isFetching} onRetry={() => { void query.refetch() }} /> : null}
      <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{query.data.recovery_app_name}</p>
            <p className="mt-1 font-mono text-[11px] text-text-subtle [overflow-wrap:anywhere]">{query.data.recovery_app_id} · {query.data.run_id} · {query.data.compute_provider_id}</p>
          </div>
          <Badge color={foundCount === vmCount && !hasOwnershipWarning && !query.data.warnings.length ? 'success' : 'warning'} size="sm">
            {foundCount}/{vmCount} {t(isPower ? 'recoveryInventory.power.found' : 'recoveryInventory.found').toLowerCase()}
          </Badge>
        </div>
        <div className={`mt-3 grid gap-2 ${isPower ? 'grid-cols-2 @min-[600px]/detail-content:grid-cols-3' : 'grid-cols-3'}`}>
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-2.5 py-2">
              <strong className="block text-base text-text-primary">{value}</strong>
              <span className="text-[10px] font-medium uppercase tracking-wide text-text-subtle">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {query.data.warnings.length > 0 ? (
        <section aria-label={t('recoveryInventory.warnings')}>
          <Alert variant="warning" title={t('recoveryInventory.warnings')} description={(
            <>
              <p>{t('recoveryInventory.partial')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {query.data.warnings.map((warning, index) => <li key={index} className="[overflow-wrap:anywhere]">{warning}</li>)}
              </ul>
            </>
          )} />
        </section>
      ) : null}
      {isPower ? <RecoveryApplicationPowerInventory inventory={query.data} />
        : query.data.platform === 'vmware' ? <RecoveryApplicationVmwareInventory inventory={query.data} />
          : <>
            <Alert variant="info" title={t('recoveryInventory.unknownPlatform', { platform: query.data.platform })} />
            <div aria-label={t('recoveryInventory.showTechnicalJson')}><ResponseBodyViewer data={query.data} defaultOpen={false} /></div>
          </>}
    </div>
  )
}
