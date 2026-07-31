export interface FlashSystemFilters {
  search: string
  providerId: string
  poolId: string
  hostId: string
  status: string
}

export interface PowerFilters {
  search: string
  providerId: string
  partitionKind: string
  partitionState: string
  operatingSystemType: string
  volumeState: string
}

export interface FlashSystemFilterOptions {
  pools: { id: string; name: string; providerId: string; sourceId: string }[]
  hosts: { id: string; name: string; providerId: string; sourceId: string }[]
  statuses: string[]
}

export interface PowerFilterOptions {
  partitionKinds: string[]
  partitionStates: string[]
  operatingSystemTypes: string[]
  volumeStates: string[]
}
