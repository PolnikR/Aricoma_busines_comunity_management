export type PowerFieldGroup =
  | 'identity'
  | 'processorMemory'
  | 'operatingSystem'
  | 'network'
  | 'storage'
  | 'virtualIo'
  | 'monitoring'

export interface PowerFieldDefinition {
  key: string
  label: string
  group: PowerFieldGroup
  table?: boolean
  searchable?: boolean
}

const identity = [
  'AtomID', 'AtomCreated', 'PartitionID', 'PartitionName', 'PartitionType',
  'PartitionState', 'PartitionUUID', 'LogicalSerialNumber', 'Description',
  'SystemName', 'IsServicePartition', 'LastActivatedProfile',
] as const

const processorMemory = [
  'CurrentProcessorCompatibilityMode', 'ActiveMemoryExpansionEnabled',
  'ActiveMemorySharingEnabled', 'DesiredMemory', 'ExpansionFactor',
  'HardwarePageTableRatio', 'MaximumMemory', 'MinimumMemory',
  'CurrentExpansionFactor', 'CurrentHardwarePageTableRatio',
  'CurrentHugePageCount', 'CurrentMaximumHugePageCount', 'CurrentMaximumMemory',
  'CurrentMemory', 'CurrentMinimumHugePageCount', 'CurrentMinimumMemory',
  'MemoryExpansionHardwareAccessEnabled', 'MemoryEncryptionHardwareAccessEnabled',
  'MemoryExpansionEnabled', 'RuntimeHugePageCount', 'RuntimeMemory',
  'RuntimeMinimumMemory', 'SharedMemoryEnabled', 'PhysicalPageTableRatio',
  'DesiredProcessors', 'MaximumProcessors', 'MinimumProcessors',
  'HasDedicatedProcessors', 'SharingMode', 'CurrentHasDedicatedProcessors',
  'CurrentSharingMode', 'CurrentMaximumProcessors', 'CurrentMinimumProcessors',
  'CurrentProcessors', 'RunProcessors', 'RuntimeHasDedicatedProcessors',
  'PendingProcessorCompatibilityMode',
] as const

const operatingSystem = [
  'OperatingSystemVersion', 'OperatingSystemType', 'BootMode', 'Uptime',
  'PowerOnWithHypervisor', 'IsBootable', 'KeylockPosition',
  'VirtualIOServerLicenseAccepted',
] as const

const network = [
  'DeviceName', 'InterfaceName', 'State', 'IPAddress', 'SubnetMask',
  'LocationCode', 'PortName', 'WWPN', 'WWNN',
] as const

const storage = [
  'ReservePolicy', 'ReservePolicyAlgorithm', 'AvailableForUsage',
  'VolumeCapacity', 'VolumeName', 'VolumeState', 'VolumeUniqueID',
  'IsFibreChannelBacked', 'IsISCSIBacked', 'StorageLabel', 'DescriptorPage83',
  'DeviceType', 'AlternateLoadSourceAttached', 'LoadSourceAttached',
  'LoadSourceCapable',
] as const

const virtualIo = [
  'MaximumVirtualIOSlots', 'CurrentMaximumVirtualIOSlots', 'BusGroupingRequired',
  'FeatureCodes', 'IOUnitPhysicalLocation', 'PCAdapterID', 'PCIClass',
  'PCIDeviceID', 'PCISubsystemDeviceID', 'PCIManufacturerID', 'PCIRevisionID',
  'PCIVendorID', 'PCISubsystemVendorID', 'ConsoleCapable',
  'DirectOperationsConsoleCapable', 'IOP', 'IOPInfoStale', 'IOPoolID',
  'LANConsoleCapable', 'OperationsConsoleAttached', 'OperationsConsoleCapable',
  'AdapterID', 'DynamicReconfigurationConnectorName', 'PhysicalLocation',
  'UniqueDeviceID', 'LogicalPartitionAssignmentCapable',
  'DynamicPartitionAssignmentCapable', 'SlotDynamicReconfigurationConnectorIndex',
  'SlotDynamicReconfigurationConnectorName', 'SlotPhysicalLocationCode',
  'SRIOVCapableDevice', 'SRIOVCapableSlot', 'SRIOVLogicalPortsLimit',
  'HasPhysicalIO', 'APICapable', 'IsVNICCapable', 'VNICFailOverCapable',
  'ManagerPassthroughCapable', 'MoverServicePartition',
] as const

const monitoring = [
  'AllowPerformanceDataCollection', 'AvailabilityPriority', 'CurrentProfileSync',
  'IsConnectionMonitoringEnabled', 'IsOperationInProgress',
  'IsRedundantErrorPathReportingEnabled', 'IsTimeReferencePartition',
  'IsVirtualServiceAttentionLEDOn', 'IsVirtualTrustedPlatformModuleEnabled',
  'DynamicLogicalPartitionIOCapable', 'DynamicLogicalPartitionMemoryCapable',
  'DynamicLogicalPartitionVIOSCapable', 'DynamicLogicalPartitionProcessorCapable',
  'InternalAndExternalIntrusionDetectionCapable',
  'ResourceMonitoringControlOperatingSystemShutdownCapable',
  'RedundantErrorPathReportingEnabled', 'ProgressPartitionDataRemaining',
  'ProgressPartitionDataTotal', 'ResourceMonitoringControlState',
  'ResourceMonitoringIPAddress', 'PowerVMManagementCapable',
  'AssignAllResources', 'IsTierCapable', 'IsTierMirrorCapable', 'GPFSCapable',
  'FibreChannelPortLabelCapable',
] as const

const tableFields = new Set([
  'PartitionName', 'OperatingSystemType', 'DeviceName', 'BootMode',
  'PowerOnWithHypervisor', 'VolumeCapacity', 'VolumeName', 'VolumeState',
])

const searchableFields = new Set([
  'PartitionName', 'SystemName', 'LogicalSerialNumber', 'IPAddress',
  'DeviceName', 'VolumeName',
])

function entries(keys: readonly string[], group: PowerFieldGroup): PowerFieldDefinition[] {
  return keys.map((key) => ({
    key,
    label: key.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2'),
    group,
    ...(tableFields.has(key) ? { table: true } : {}),
    ...(searchableFields.has(key) ? { searchable: true } : {}),
  }))
}

export const powerFieldRegistry: readonly PowerFieldDefinition[] = [
  ...entries(identity, 'identity'),
  ...entries(processorMemory, 'processorMemory'),
  ...entries(operatingSystem, 'operatingSystem'),
  ...entries(network, 'network'),
  ...entries(storage, 'storage'),
  ...entries(virtualIo, 'virtualIo'),
  ...entries(monitoring, 'monitoring'),
]

export const powerFieldKeys = new Set(powerFieldRegistry.map((field) => field.key))
