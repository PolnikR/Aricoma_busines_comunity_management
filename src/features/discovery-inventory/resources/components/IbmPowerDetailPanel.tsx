import { DetailDrawer, DetailRow } from '@/shared/components/data-table'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import { powerFieldRegistry } from '../config/powerFieldRegistry'
import type { PowerFieldGroup } from '../config/powerFieldRegistry'

interface IbmPowerDetailPanelProps {
  partition: PowerPartitionResource | null
  open: boolean
  onClose: () => void
  labels: Record<PowerFieldGroup | 'selected' | 'detail' | 'close' | 'summary' | 'provider' | 'partitionKind' | 'partitionState' | 'interfaceState' | 'ipAddress' | 'subnetMask' | 'isBootable' | 'maximumVirtualIoSlots' | 'yes' | 'no', string> & {
    fieldLabels: Record<string, string>
  }
}

const groupOrder: PowerFieldGroup[] = [
  'identity',
  'processorMemory',
  'operatingSystem',
  'network',
  'storage',
  'virtualIo',
  'monitoring',
]

function display(value: unknown, yes: string, no: string): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? yes : no
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export function IbmPowerDetailPanel({ partition, open, onClose, labels }: IbmPowerDetailPanelProps) {
  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      eyebrow={labels.selected}
      title={partition?.partitionName ?? '-'}
      subtitle={partition ? `${partition.partitionKind} · ${partition.systemName}` : ''}
      ariaLabel={labels.detail}
      closeLabel={labels.close}
      resizable
    >
      {partition ? (
        <div className="space-y-5 p-5">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{labels.summary}</h3>
            <dl>
              <DetailRow label={labels.provider} value={partition.providerId || '-'} />
              <DetailRow label={labels.partitionKind} value={partition.partitionKind} />
              <DetailRow label={labels.partitionState} value={partition.partitionState || '-'} />
              <DetailRow label={labels.interfaceState} value={display(partition.partitionData['State'], labels.yes, labels.no)} />
              <DetailRow label={labels.ipAddress} value={display(partition.partitionData['IPAddress'], labels.yes, labels.no)} />
              <DetailRow label={labels.subnetMask} value={display(partition.partitionData['SubnetMask'], labels.yes, labels.no)} />
              <DetailRow label={labels.isBootable} value={display(partition.partitionData['IsBootable'], labels.yes, labels.no)} />
              <DetailRow label={labels.maximumVirtualIoSlots} value={display(partition.partitionData['MaximumVirtualIOSlots'], labels.yes, labels.no)} />
            </dl>
          </section>
          {groupOrder.map((group) => {
            const fields = powerFieldRegistry.filter((field) => field.group === group && partition.partitionData[field.key] !== undefined)
            if (fields.length === 0) return null
            return (
              <section key={group}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{labels[group]}</h3>
                <dl>{fields.map((field) => <DetailRow key={field.key} label={labels.fieldLabels[field.key] ?? field.label} value={display(partition.partitionData[field.key], labels.yes, labels.no)} />)}</dl>
              </section>
            )
          })}
        </div>
      ) : null}
    </DetailDrawer>
  )
}
