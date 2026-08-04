import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { useTranslation } from '@/hooks/useTranslation'
import type { VirtualMachine } from '../types'

type Translate = ReturnType<typeof useTranslation>['t']

function powerState(value: string, t: Translate): { tone: 'on' | 'off'; label: string } {
  return value === 'poweredOn'
    ? { tone: 'on', label: t('vm.state.on') }
    : { tone: 'off', label: t('vm.state.off') }
}

function connectionState(value: string, t: Translate): { tone: 'on' | 'warn'; label: string } {
  return value === 'connected'
    ? { tone: 'on', label: t('vm.state.connected') }
    : { tone: 'warn', label: value || t('details.unknown') }
}

export function createVmwareColumns(t: Translate, showDetail: boolean): ColumnDef<VirtualMachine>[] {
  const sub = 'block max-w-45 truncate text-[11px] text-text-subtle'

  return [
    {
      id: 'name',
      header: t('tables.vm.name'),
      cell: (vm) => (
        <>
          <span className="block max-w-65 truncate text-[13px] font-semibold text-text-primary" title={vm.name}>{vm.name}</span>
          {showDetail ? (
            <span className="mt-0.5 block max-w-65 truncate font-mono text-[11px] text-text-subtle" title={`${vm.hostname} / ${vm.ipAddress}`}>
              {vm.ipAddress || vm.hostname || '-'}
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: 'os',
      header: t('tables.vm.os'),
      cell: (vm) => <span className="block max-w-55 truncate" title={vm.guestOs}>{vm.guestOs || '-'}</span>,
    },
    {
      id: 'placement',
      header: t('tables.vm.placement'),
      cell: (vm) => (
        <div className="flex flex-col gap-0.5">
          <span className="block max-w-45 truncate" title={vm.cluster}>{vm.cluster || '-'}</span>
          {showDetail ? (
            <>
              <span className={sub} title={vm.host}>{vm.host || '-'}</span>
              <span className={`${sub} font-mono`} title={vm.datastore}>{vm.datastore || '-'}</span>
              <span className={sub} title={vm.folder}>{vm.folder || '-'}</span>
            </>
          ) : null}
        </div>
      ),
    },
    {
      id: 'provider',
      header: t('tables.vm.provider'),
      cell: (vm) => {
        const provider = vm.providerType === '-' && vm.providerId === '-'
          ? '-'
          : `${vm.providerType}-${vm.providerId}`
        return <span className="block truncate" title={provider}>{provider}</span>
      },
    },
    {
      id: 'tags',
      header: t('tables.vm.tags'),
      cell: (vm) => vm.tags.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {vm.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-accent">{tag}</span>
          ))}
          {vm.tags.length > 3 ? <span className="text-[11px] text-text-subtle">+{vm.tags.length - 3}</span> : null}
        </span>
      ) : <span className="text-text-subtle">-</span>,
    },
    {
      id: 'compute',
      header: t('tables.vm.compute'),
      cell: (vm) => (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <span>{vm.vcpu} vCPU · {vm.memoryGb} GB</span>
          {showDetail ? <span className={sub}>{vm.diskCount} disks · {Math.round(vm.diskCapacityGb)} GB</span> : null}
        </div>
      ),
    },
    {
      id: 'connection',
      header: t('tables.vm.connection'),
      cell: (vm) => <StateCell {...connectionState(vm.connectionState, t)} title={vm.connectionState} />,
    },
    {
      id: 'power',
      header: t('tables.vm.power'),
      cell: (vm) => <StateCell {...powerState(vm.powerState, t)} title={vm.powerState} />,
    },
    {
      id: 'snapshots',
      header: t('tables.vm.snapshots'),
      align: 'right',
      cell: (vm) => <span className={vm.snapshotCount === 0 ? 'text-text-subtle' : undefined}>{vm.snapshotCount}</span>,
    },
  ]
}
