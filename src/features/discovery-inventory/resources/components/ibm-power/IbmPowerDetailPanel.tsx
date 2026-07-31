import { DetailDrawer, DetailRow } from '@/shared/components/data-table'
import type { PowerPartitionData, PowerPartitionResource } from '../../../model/discoveryTypes'

type SectionKey = 'summary' | 'processorMemory' | 'network' | 'storage' | 'virtualIo'
type FieldKey =
  | 'partitionUuid'
  | 'logicalSerialNumber'
  | 'lastActivatedProfile'
  | 'uptime'
  | 'bootable'
  | 'processors'
  | 'processorLimits'
  | 'processorMode'
  | 'memory'
  | 'memoryLimits'
  | 'interface'
  | 'address'
  | 'interfaceState'
  | 'monitoring'
  | 'volume'
  | 'capacity'
  | 'volumeUniqueId'
  | 'reservation'
  | 'storageConnection'
  | 'fibreChannelIdentity'
  | 'virtualIoSlots'
  | 'physicalIo'
  | 'sriov'

interface IbmPowerDetailPanelProps {
  partition: PowerPartitionResource | null
  open: boolean
  onClose: () => void
  labels: {
    selected: string
    detail: string
    close: string
    yes: string
    no: string
    sections: Record<SectionKey, string>
    fields: Record<FieldKey, string>
    values: {
      dedicated: string
      shared: string
      fibreChannel: string
      iscsi: string
      direct: string
    }
  }
}

interface DetailSectionProps {
  title: string
  rows: { label: string; value: string }[]
}

function DetailSection({ title, rows }: DetailSectionProps) {
  const visibleRows = rows.filter((row) => row.value !== '-')
  if (visibleRows.length === 0) return null
  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#71819a]">{title}</h3>
      <dl>
        {visibleRows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </section>
  )
}

function raw(data: PowerPartitionData, key: string): unknown {
  return data[key]
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return null
}

function display(value: unknown, yes: string, no: string): string {
  if (value === null || value === undefined || value === '') return '-'
  const boolean = booleanValue(value)
  if (boolean !== null) return boolean ? yes : no
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return '-'
}

function combine(values: unknown[], yes: string, no: string, separator = ' · '): string {
  const visible = values.map((value) => display(value, yes, no)).filter((value) => value !== '-')
  return visible.join(separator) || '-'
}

function processorMode(data: PowerPartitionData, labels: IbmPowerDetailPanelProps['labels']): string {
  const dedicated = booleanValue(raw(data, 'HasDedicatedProcessors'))
  const mode = dedicated === null ? null : dedicated ? labels.values.dedicated : labels.values.shared
  return combine([mode, raw(data, 'CurrentSharingMode')], labels.yes, labels.no)
}

function storageConnection(data: PowerPartitionData, labels: IbmPowerDetailPanelProps['labels']): string {
  const fibreChannel = booleanValue(raw(data, 'IsFibreChannelBacked'))
  const iscsi = booleanValue(raw(data, 'IsISCSIBacked'))

  if (fibreChannel === true) return labels.values.fibreChannel
  if (iscsi === true) return labels.values.iscsi
  if (fibreChannel !== null || iscsi !== null) return labels.values.direct
  return '-'
}

export function IbmPowerDetailPanel({ partition, open, onClose, labels }: IbmPowerDetailPanelProps) {
  const data = partition?.partitionData
  const yes = labels.yes
  const no = labels.no

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      eyebrow={labels.selected}
      title={partition?.partitionName ?? '-'}
      subtitle=""
      ariaLabel={labels.detail}
      closeLabel={labels.close}
      resizable
    >
      {partition && data ? (
        <div className="space-y-5 p-5">
          <DetailSection
            title={labels.sections.summary}
            rows={[
              { label: labels.fields.partitionUuid, value: display(raw(data, 'PartitionUUID'), yes, no) },
              { label: labels.fields.logicalSerialNumber, value: display(raw(data, 'LogicalSerialNumber'), yes, no) },
              { label: labels.fields.lastActivatedProfile, value: display(raw(data, 'LastActivatedProfile'), yes, no) },
              { label: labels.fields.uptime, value: display(raw(data, 'Uptime'), yes, no) },
              { label: labels.fields.bootable, value: display(raw(data, 'IsBootable'), yes, no) },
            ]}
          />
          <DetailSection
            title={labels.sections.processorMemory}
            rows={[
              { label: labels.fields.processors, value: combine([raw(data, 'CurrentProcessors'), raw(data, 'DesiredProcessors')], yes, no, ' / ') },
              { label: labels.fields.processorLimits, value: combine([raw(data, 'MinimumProcessors'), raw(data, 'MaximumProcessors')], yes, no, ' – ') },
              {
                label: labels.fields.processorMode,
                value: processorMode(data, labels),
              },
              { label: labels.fields.memory, value: combine([raw(data, 'CurrentMemory'), raw(data, 'DesiredMemory')], yes, no, ' / ') },
              { label: labels.fields.memoryLimits, value: combine([raw(data, 'MinimumMemory'), raw(data, 'MaximumMemory')], yes, no, ' – ') },
            ]}
          />
          <DetailSection
            title={labels.sections.network}
            rows={[
              { label: labels.fields.interface, value: combine([raw(data, 'InterfaceName'), raw(data, 'DeviceName')], yes, no) },
              { label: labels.fields.address, value: combine([raw(data, 'IPAddress'), raw(data, 'SubnetMask')], yes, no, ' / ') },
              { label: labels.fields.interfaceState, value: display(raw(data, 'State'), yes, no) },
              { label: labels.fields.monitoring, value: combine([raw(data, 'ResourceMonitoringControlState'), raw(data, 'ResourceMonitoringIPAddress')], yes, no) },
            ]}
          />
          <DetailSection
            title={labels.sections.storage}
            rows={[
              { label: labels.fields.volume, value: combine([raw(data, 'VolumeName'), raw(data, 'VolumeState')], yes, no) },
              { label: labels.fields.capacity, value: display(raw(data, 'VolumeCapacity'), yes, no) },
              { label: labels.fields.volumeUniqueId, value: display(raw(data, 'VolumeUniqueID'), yes, no) },
              { label: labels.fields.reservation, value: combine([raw(data, 'ReservePolicy'), raw(data, 'ReservePolicyAlgorithm')], yes, no) },
              {
                label: labels.fields.storageConnection,
                value: storageConnection(data, labels),
              },
              ...(booleanValue(raw(data, 'IsFibreChannelBacked')) === true
                ? [{
                    label: labels.fields.fibreChannelIdentity,
                    value: combine([raw(data, 'PortName'), raw(data, 'WWPN'), raw(data, 'WWNN')], yes, no),
                  }]
                : []),
            ]}
          />
          <DetailSection
            title={labels.sections.virtualIo}
            rows={[
              { label: labels.fields.virtualIoSlots, value: display(raw(data, 'MaximumVirtualIOSlots'), yes, no) },
              { label: labels.fields.physicalIo, value: combine([raw(data, 'HasPhysicalIO'), raw(data, 'PhysicalLocation')], yes, no) },
              {
                label: labels.fields.sriov,
                value: booleanValue(raw(data, 'SRIOVCapableSlot')) === true
                  ? combine([raw(data, 'SRIOVCapableSlot'), raw(data, 'SRIOVLogicalPortsLimit')], yes, no)
                  : display(raw(data, 'SRIOVCapableSlot'), yes, no),
              },
            ]}
          />
        </div>
      ) : null}
    </DetailDrawer>
  )
}
