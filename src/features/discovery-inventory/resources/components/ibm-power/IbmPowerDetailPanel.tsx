import type { ComponentType, SVGProps } from 'react'
import { DetailField, DetailOverview, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { CpuIcon, GridIcon, LayersIcon, NetworkIcon, ServerIcon } from '@/shared/icons/Icons'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PowerPartitionData, PowerPartitionResource } from '../../model/discoveryTypes'
import { useVdisksByVm } from '../../hooks/useVmStorageVolumes'
import { BackingStorageInfo } from '../BackingStorageInfo'
import { LparRelationshipHelp } from './LparRelationshipHelp'

type SectionKey = 'summary' | 'processorMemory' | 'network' | 'storage' | 'virtualIo' | 'backingStorage'
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
  // Already loaded providers, used to name the backing storage provider.
  providers?: ProviderRecord[]
  labels: {
    entity: string
    detail: string
    close: string
    yes: string
    no: string
    emptyBackingStorage: string
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

interface PartitionRow {
  label: string
  value: string
  // Identifiers (UUID, serial number, volume ID, FC port) render monospace with a copy action.
  identifier?: boolean
}

interface PartitionSectionData {
  id: SectionKey
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  rows: PartitionRow[]
}

// Rows without a value are hidden, and a section without any row is left out. The sections
// are rendered as direct DetailViewSection children (the DetailView composition contract),
// not through a wrapper component.
const visibleRows = (rows: PartitionRow[]) => rows.filter((row) => row.value !== '-')

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

export function IbmPowerDetailPanel({ partition, open, onClose, providers = [], labels }: IbmPowerDetailPanelProps) {
  const data = partition?.partitionData
  const yes = labels.yes
  const no = labels.no
  // Backing storage is resolved for LPARs only (LPAR -> NPIV WWPN -> FlashSystem host).
  // A VIOS passes disabled arguments, so the query sends no request.
  const isLpar = partition?.partitionKind === 'LPAR'
  const {
    data: vdisks,
    isLoading: vdisksLoading,
    isError: vdisksError,
    isFetching: vdisksFetching,
    refetch: refetchVdisks,
  } = useVdisksByVm(
    isLpar ? partition.partitionName : '',
    isLpar ? partition.providerId : undefined,
  )

  if (!open || !partition || !data) return null

  const fieldSections: PartitionSectionData[] = [
    {
      id: 'summary',
      title: labels.sections.summary,
      icon: GridIcon,
      rows: [
        { label: labels.fields.partitionUuid, value: display(raw(data, 'PartitionUUID'), yes, no), identifier: true },
        { label: labels.fields.logicalSerialNumber, value: display(raw(data, 'LogicalSerialNumber'), yes, no), identifier: true },
        { label: labels.fields.lastActivatedProfile, value: display(raw(data, 'LastActivatedProfile'), yes, no) },
        { label: labels.fields.uptime, value: display(raw(data, 'Uptime'), yes, no) },
        { label: labels.fields.bootable, value: display(raw(data, 'IsBootable'), yes, no) },
      ],
    },
    {
      id: 'processorMemory',
      title: labels.sections.processorMemory,
      icon: CpuIcon,
      rows: [
        { label: labels.fields.processors, value: combine([raw(data, 'CurrentProcessors'), raw(data, 'DesiredProcessors')], yes, no, ' / ') },
        { label: labels.fields.processorLimits, value: combine([raw(data, 'MinimumProcessors'), raw(data, 'MaximumProcessors')], yes, no, ' – ') },
        { label: labels.fields.processorMode, value: processorMode(data, labels) },
        { label: labels.fields.memory, value: combine([raw(data, 'CurrentMemory'), raw(data, 'DesiredMemory')], yes, no, ' / ') },
        { label: labels.fields.memoryLimits, value: combine([raw(data, 'MinimumMemory'), raw(data, 'MaximumMemory')], yes, no, ' – ') },
      ],
    },
    {
      id: 'network',
      title: labels.sections.network,
      icon: NetworkIcon,
      rows: [
        { label: labels.fields.interface, value: combine([raw(data, 'InterfaceName'), raw(data, 'DeviceName')], yes, no) },
        { label: labels.fields.address, value: combine([raw(data, 'IPAddress'), raw(data, 'SubnetMask')], yes, no, ' / ') },
        { label: labels.fields.interfaceState, value: display(raw(data, 'State'), yes, no) },
        { label: labels.fields.monitoring, value: combine([raw(data, 'ResourceMonitoringControlState'), raw(data, 'ResourceMonitoringIPAddress')], yes, no) },
      ],
    },
    {
      id: 'storage',
      title: labels.sections.storage,
      icon: LayersIcon,
      rows: [
        { label: labels.fields.volume, value: combine([raw(data, 'VolumeName'), raw(data, 'VolumeState')], yes, no) },
        { label: labels.fields.capacity, value: display(raw(data, 'VolumeCapacity'), yes, no) },
        { label: labels.fields.volumeUniqueId, value: display(raw(data, 'VolumeUniqueID'), yes, no), identifier: true },
        { label: labels.fields.reservation, value: combine([raw(data, 'ReservePolicy'), raw(data, 'ReservePolicyAlgorithm')], yes, no) },
        { label: labels.fields.storageConnection, value: storageConnection(data, labels) },
        ...(booleanValue(raw(data, 'IsFibreChannelBacked')) === true
          ? [{ label: labels.fields.fibreChannelIdentity, value: combine([raw(data, 'PortName'), raw(data, 'WWPN'), raw(data, 'WWNN')], yes, no), identifier: true }]
          : []),
      ],
    },
    {
      id: 'virtualIo',
      title: labels.sections.virtualIo,
      icon: ServerIcon,
      rows: [
        { label: labels.fields.virtualIoSlots, value: display(raw(data, 'MaximumVirtualIOSlots'), yes, no) },
        { label: labels.fields.physicalIo, value: combine([raw(data, 'HasPhysicalIO'), raw(data, 'PhysicalLocation')], yes, no) },
        {
          label: labels.fields.sriov,
          value: booleanValue(raw(data, 'SRIOVCapableSlot')) === true
            ? combine([raw(data, 'SRIOVCapableSlot'), raw(data, 'SRIOVLogicalPortsLimit')], yes, no)
            : display(raw(data, 'SRIOVCapableSlot'), yes, no),
        },
      ],
    },
  ]
  return (
    <DetailView
      // Keyed by partition so each newly opened partition starts expanded on its first section.
      key={partition.id}
      open
      onClose={onClose}
      size="xl"
      entityLabel={labels.entity}
      title={partition.partitionName || '-'}
      headerActions={(
        <KeyedHelpPopover helpKey="resources.power.help" sections={['processor', 'storage', 'virtualIo', 'backing']} width="wide">
          {isLpar ? (
            <LparRelationshipHelp
              partition={partition}
              volumes={vdisks?.volumes ?? []}
              isLoading={vdisksLoading}
              isError={vdisksError}
              providers={providers}
            />
          ) : null}
        </KeyedHelpPopover>
      )}
      ariaLabel={labels.detail}
      closeLabel={labels.close}
    >
      {fieldSections.map((section) => {
        const rows = visibleRows(section.rows)
        return rows.length > 0 ? (
          <DetailViewSection key={section.id} id={section.id} title={section.title} icon={section.icon}>
            <DetailOverview>
              {rows.map((row) => (
                <DetailField key={row.label} label={row.label} value={row.value} mono={row.identifier} copyValue={row.identifier ? row.value : undefined} />
              ))}
            </DetailOverview>
          </DetailViewSection>
        ) : null
      })}
      {isLpar ? (
        <DetailViewSection id="backingStorage" title={labels.sections.backingStorage} icon={LayersIcon}>
          <BackingStorageInfo
            volumes={vdisks?.volumes ?? []}
            isLoading={vdisksLoading}
            isError={vdisksError}
            isFetching={vdisksFetching}
            onRetry={() => { void refetchVdisks() }}
            providers={providers}
            identity="volumeIdAndUid"
            emptyText={labels.emptyBackingStorage}
          />
        </DetailViewSection>
      ) : null}
    </DetailView>
  )
}
