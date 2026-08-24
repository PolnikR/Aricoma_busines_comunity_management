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
  naaId: string
  id: string
  name: string
  volumeName: string
  capacity: string
  status: string
  pool: string
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
