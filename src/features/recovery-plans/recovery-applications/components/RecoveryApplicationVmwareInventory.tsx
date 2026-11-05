import type { RecoveryAppInventoryResponseOutput } from '@/generated/query/zod'
import { Badge } from '@/shared/components/badge/Badge'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'

export function RecoveryApplicationVmwareInventory({ inventory }: { inventory: RecoveryAppInventoryResponseOutput }) {
  const { t } = useTranslation()
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{t('recoveryInventory.recoveredDatastores')}</p>
      {inventory.recovered_datastores.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : (
        <div className="space-y-2">
          {inventory.recovered_datastores.map(datastore => (
            <div key={datastore.datastore} className="rounded-md border border-border bg-surface px-2.5 py-2">
              <span className="block truncate text-xs font-semibold text-text-primary">{datastore.datastore}</span>
              <p className="mt-1 truncate font-mono text-[10px] text-text-subtle">{t('recoveryInventory.targetVolume')}: {datastore.target_vdisk ?? '—'}</p>
              <p className="mt-1 truncate text-[10px] text-text-subtle">{t('recoveryInventory.virtualMachines')}: {datastore.vms.join(', ') || '—'}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{t('recoveryInventory.tierInventory')}</p>
      {inventory.tiers.length === 0 ? <p className="text-sm text-text-subtle">{t('recoveryInventory.empty')}</p> : inventory.tiers.map(tier => {
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
    </>
  )
}
