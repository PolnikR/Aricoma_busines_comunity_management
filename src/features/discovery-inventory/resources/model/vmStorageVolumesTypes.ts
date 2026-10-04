export interface StorageVolumeMapping {
  id: string
  name: string
  sourceVdiskId: string
  sourceVdiskName: string
  targetVdiskId: string
  targetVdiskName: string
  status: string
  progress: string
  copyRate: string
  cleanProgress: string
  startTime: string
}

export interface StorageVolumeSnapshots {
  hasSnapshots: boolean
  snapshotCount: number
  isSnapshot: boolean
  sourceMappings: StorageVolumeMapping[]
  targetMappings: StorageVolumeMapping[]
}

export interface StorageVolume {
  // The vdisks object key: an NAA for VMware, an internal composite key for IBM Power.
  // Used only as identity; never rendered.
  key: string
  // The key when it is an NAA, otherwise null.
  naa: string | null
  volumeId: string
  id: string
  name: string
  volumeName: string
  capacity: string
  status: string
  pool: string
  ioGroupName: string
  storageProviderId: string
  type: string
  protocol: string
  vdiskUid: string
  copyCount: string
  fcMapCount: string
  snapshots: StorageVolumeSnapshots
}

export interface VmStorageVolumes {
  vmName: string
  countVm: number
  countIbm: number
  volumes: StorageVolume[]
}
