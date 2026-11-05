import type { RecoveryAppInventoryResponseOutput, RecoveryAppInventoryVmOutput, RecoveredHostOutput } from '@/generated/query/zod'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'

const summaryClass = 'flex cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg px-3 py-3 marker:hidden hover:bg-surface-hover/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15'

function fieldValue(value: unknown): string | number {
  if (typeof value === 'string') return value.trim() ? value : '—'
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return '—'
}

function stringList(value: unknown): string | null {
  return Array.isArray(value) && value.length > 0 && value.every((item: unknown) => typeof item === 'string') ? value.join(', ') : null
}

function recordText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function PowerFields({ fields }: { fields: [string, unknown][] }) {
  const { t } = useTranslation()
  return (
    <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-2 @min-[600px]/detail-content:grid-cols-2">
      {fields.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-[11px] text-text-muted">{t(`recoveryInventory.power.${key}`)}</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-xs text-text-primary [overflow-wrap:anywhere]">{fieldValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Adapters({ kind, adapters }: { kind: 'vfc' | 'ethernet'; adapters: Record<string, unknown>[] | null | undefined }) {
  const { t } = useTranslation()
  const fields: [string, string][] = kind === 'vfc'
    ? [['slot', 'slot'], ['wwpns', 'wwpns'], ['viosName', 'vios_name'], ['viosUuid', 'vios_uuid'], ['portName', 'port_name'], ['portWwpn', 'port_wwpn']]
    : [['slot', 'slot'], ['vlan', 'vlan'], ['mac', 'mac'], ['switch', 'switch']]
  return (
    <section aria-label={t(`recoveryInventory.power.${kind}`)} className="min-w-0 space-y-2">
      <h5 className="text-xs font-semibold text-text-primary">{t(`recoveryInventory.power.${kind}`)}</h5>
      {adapters == null ? <p className="text-xs text-text-muted">{t('recoveryInventory.power.unavailable')}</p>
        : adapters.length === 0 ? <p className="text-xs text-text-muted">{t('recoveryInventory.power.adaptersEmpty')}</p>
          : adapters.map((adapter, index) => (
            <div key={index} className="rounded-md border border-border bg-surface p-2.5">
              <PowerFields fields={fields.map(([label, key]) => {
                const value = adapter[key]
                const checked = key === 'slot' || key === 'vlan' ? typeof value === 'number' ? value : null
                  : key === 'wwpns' ? stringList(value) : recordText(value)
                return [label, checked]
              })} />
            </div>
          ))}
    </section>
  )
}

function LparDetails({ vm }: { vm: RecoveryAppInventoryVmOutput }) {
  const { t } = useTranslation()
  return (
    <div className="min-w-0 space-y-3 border-t border-border bg-surface-subtle p-3">
      <PowerFields fields={[
        ['sourceName', vm.source_name ?? vm.name], ['targetName', vm.target_name],
        ['hmcProvider', vm.target_hmc_provider_id], ['managedSystem', vm.target_managed_system], ['expectedHost', vm.host],
      ]} />
      {vm.other_hosts?.length ? <Alert size="sm" variant="warning" title={t('recoveryInventory.power.coHolding')} description={<><span>{t('recoveryInventory.power.otherHosts')}: </span>{vm.other_hosts.join(', ')}</>} /> : null}
      <p className="text-xs text-text-muted">{t(vm.lpar ? 'recoveryInventory.power.lparExists' : 'recoveryInventory.power.lparMissing')}</p>
      {vm.lpar ? (
        <>
          <PowerFields fields={[
            ['uuid', vm.lpar.uuid], ['state', vm.lpar.state], ['rmcState', vm.lpar.rmc_state], ['managedSystem', vm.lpar.managed_system],
          ]} />
          <Adapters kind="vfc" adapters={vm.lpar.vfc} />
          <Adapters kind="ethernet" adapters={vm.lpar.ethernet} />
        </>
      ) : null}
    </div>
  )
}

function PowerHost({ host }: { host: RecoveredHostOutput }) {
  const { t, language } = useTranslation()
  return (
    <details className="group/host min-w-0 rounded-lg border border-border bg-surface">
      <summary tabIndex={0} className={summaryClass}>
        <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-text-muted transition-transform group-open/host:rotate-0" />
        <span className="min-w-0 flex-1 text-xs font-semibold text-text-primary [overflow-wrap:anywhere]">{host.host}</span>
        <Badge size="sm" color={host.exists ? 'info' : 'warning'}>{t(host.exists ? 'recoveryInventory.power.hostExists' : 'recoveryInventory.power.hostMissing')}</Badge>
      </summary>
      <div className="min-w-0 space-y-3 border-t border-border bg-surface-subtle p-3">
        <PowerFields fields={[
          ['storageProvider', host.storage_provider_id], ['activePorts', host.active_ports], ['wwpns', stringList(host.wwpns)],
          ['mappedVolumes', host.volumes.length],
        ]} />
        {host.volumes.length === 0 ? <p className="text-xs text-text-muted">{t('recoveryInventory.empty')}</p> : host.volumes.map(volume => (
          <article key={`${volume.vdisk_id}-${String(volume.scsi_id)}`} className="min-w-0 space-y-2 rounded-md border border-border bg-surface p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="min-w-0 text-xs font-semibold text-text-primary [overflow-wrap:anywhere]">{volume.vdisk_name ?? volume.vdisk_id}</h5>
              {volume.boot ? <Badge size="sm" color="info">{t('recoveryInventory.power.boot')}</Badge> : null}
            </div>
            <PowerFields fields={[
              ['vdiskId', volume.vdisk_id], ['vdiskName', volume.vdisk_name], ['scsiId', volume.scsi_id],
              ['capacity', volume.capacity_bytes == null ? null : new Intl.NumberFormat(language).format(volume.capacity_bytes)], ['pool', volume.pool],
            ]} />
            <h6 className="text-xs font-semibold text-text-primary">{t('recoveryInventory.power.flashcopy')}</h6>
            {volume.flashcopy ? <PowerFields fields={[
              ['map', recordText(volume.flashcopy['map'])], ['sourceVdisk', recordText(volume.flashcopy['source_vdisk'])], ['consistencyGroup', recordText(volume.flashcopy['consistency_group'])],
            ]} /> : <p className="text-xs text-text-muted">{t('recoveryInventory.power.noFlashcopy')}</p>}
          </article>
        ))}
        <div aria-label={t('recoveryInventory.showTechnicalJson')}><ResponseBodyViewer data={host} defaultOpen={false} /></div>
      </div>
    </details>
  )
}

export function RecoveryApplicationPowerInventory({ inventory }: { inventory: RecoveryAppInventoryResponseOutput }) {
  const { t } = useTranslation()
  return (
    <>
      <section aria-label={t('recoveryInventory.tierInventory')} className="min-w-0 space-y-2">
        <h4 className="text-xs font-semibold text-text-primary">{t('recoveryInventory.tierInventory')}</h4>
        {inventory.tiers.length === 0 ? <p className="text-xs text-text-muted">{t('recoveryInventory.empty')}</p> : inventory.tiers.map(tier => (
          <details key={`${tier.tier_name}-${tier.recovery_group_id}`} className="group/tier min-w-0 rounded-lg border border-border bg-surface">
            <summary tabIndex={0} className={summaryClass}>
              <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-text-muted transition-transform group-open/tier:rotate-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{tier.tier_name}</span>
                <span className="block text-[11px] text-text-muted [overflow-wrap:anywhere]">{tier.recovery_group_name}</span>
              </span>
              <Badge size="sm" color={tier.vms.every(vm => vm.found && !vm.other_hosts?.length) ? 'success' : 'warning'}>
                {tier.vms.filter(vm => vm.found).length}/{tier.vms.length} {t('recoveryInventory.power.found')}
              </Badge>
            </summary>
            <div className="min-w-0 space-y-2 border-t border-border bg-surface-subtle p-3">
              {tier.vms.map(vm => {
                const ownership = vm.ownership
                const known = ownership === 'run' || ownership === 'foreign' || ownership === 'unattached' || ownership === 'unknown'
                const label = t(`recoveryInventory.power.ownership.${known ? ownership : 'unknown'}`)
                const status = !known && ownership ? `${label} (${ownership})` : label
                return (
                  <details key={vm.name} className="group/lpar min-w-0 rounded-lg border border-border bg-surface">
                    <summary tabIndex={0} className={summaryClass}>
                      <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-text-muted transition-transform group-open/lpar:rotate-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-text-primary [overflow-wrap:anywhere]">{vm.source_name ?? vm.name} → {vm.target_name ?? '—'}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge size="sm" color={ownership === 'foreign' ? 'error' : ownership === 'run' && !vm.other_hosts?.length ? 'success' : 'warning'}>{status}</Badge>
                          <span className="text-[11px] text-text-muted">{t(vm.found ? 'recoveryInventory.power.found' : 'recoveryInventory.power.notInRun')}</span>
                        </span>
                        {vm.other_hosts?.length ? <span className="mt-2 block text-xs text-warning-600 dark:text-orange-400 [overflow-wrap:anywhere]">{t('recoveryInventory.power.coHolding')}</span> : null}
                      </span>
                    </summary>
                    <LparDetails vm={vm} />
                  </details>
                )
              })}
              <div aria-label={t('recoveryInventory.showTechnicalJson')}><ResponseBodyViewer data={tier} defaultOpen={false} /></div>
            </div>
          </details>
        ))}
      </section>
      <section aria-label={t('recoveryInventory.power.hosts')} className="min-w-0 space-y-2">
        <h4 className="text-xs font-semibold text-text-primary">{t('recoveryInventory.power.hosts')}</h4>
        {inventory.recovered_hosts.length === 0 ? <p className="text-xs text-text-muted">{t('recoveryInventory.empty')}</p>
          : inventory.recovered_hosts.map(host => <PowerHost key={`${host.storage_provider_id ?? ''}-${host.host}`} host={host} />)}
      </section>
    </>
  )
}
