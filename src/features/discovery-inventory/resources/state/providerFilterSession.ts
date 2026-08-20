import type { FlashSystemFilters, PowerFilters } from '../model/sourceInventoryTypes'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

export const PROVIDER_FILTER_SESSION_SCHEMA_VERSION = 1

export interface ProviderFilterScope {
  role: 'source' | 'target'
  resourceTab: 'vmware' | 'flashsystem' | 'ibm-power'
  providerId: string
}

export type ProviderFilterSnapshot =
  | { resourceTab: 'vmware'; initialized: true; filters: VirtualMachineFilters }
  | { resourceTab: 'flashsystem'; initialized: true; filters: FlashSystemFilters }
  | { resourceTab: 'ibm-power'; initialized: true; filters: PowerFilters }

interface StoredProviderFilterSnapshot {
  schemaVersion: typeof PROVIDER_FILTER_SESSION_SCHEMA_VERSION
  snapshot: ProviderFilterSnapshot
}

const STORAGE_KEY_PREFIX = 'abcm-fe.discovery-inventory.provider-filters'

export function buildProviderFilterSessionKey(scope: ProviderFilterScope): string {
  return [
    STORAGE_KEY_PREFIX,
    `v${String(PROVIDER_FILTER_SESSION_SCHEMA_VERSION)}`,
    scope.role,
    scope.resourceTab,
    encodeURIComponent(scope.providerId),
  ].join('.')
}

function getSessionStorage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStringValues(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === 'string')
}

function isVmwareFilters(value: unknown): value is VirtualMachineFilters {
  if (!isRecord(value) || !hasStringValues(value, ['search', 'powerState', 'connectionState', 'cluster'])) {
    return false
  }

  return Array.isArray(value.tags)
    && value.tags.every((tag) => typeof tag === 'string')
    && typeof value.untagged === 'boolean'
}

function isFlashSystemFilters(value: unknown): value is FlashSystemFilters {
  return isRecord(value) && hasStringValues(value, ['search', 'poolId', 'hostId', 'status'])
}

function isPowerFilters(value: unknown): value is PowerFilters {
  return isRecord(value) && hasStringValues(value, [
    'search',
    'partitionKind',
    'partitionState',
    'operatingSystemType',
    'volumeState',
  ])
}

function isProviderFilterSnapshot(
  scope: ProviderFilterScope,
  value: unknown,
): value is ProviderFilterSnapshot {
  if (!isRecord(value) || value.resourceTab !== scope.resourceTab || value.initialized !== true) {
    return false
  }

  if (value.resourceTab === 'vmware') return isVmwareFilters(value.filters)
  if (value.resourceTab === 'flashsystem') return isFlashSystemFilters(value.filters)
  return isPowerFilters(value.filters)
}

function isStoredProviderFilterSnapshot(
  scope: ProviderFilterScope,
  value: unknown,
): value is StoredProviderFilterSnapshot {
  return isRecord(value)
    && value.schemaVersion === PROVIDER_FILTER_SESSION_SCHEMA_VERSION
    && isProviderFilterSnapshot(scope, value.snapshot)
}

export function readProviderFilterSnapshot(
  scope: ProviderFilterScope,
  storage: Storage | undefined = getSessionStorage(),
): ProviderFilterSnapshot | undefined {
  if (!storage) return undefined

  try {
    const stored = storage.getItem(buildProviderFilterSessionKey(scope))
    if (!stored) return undefined

    const parsed: unknown = JSON.parse(stored)
    return isStoredProviderFilterSnapshot(scope, parsed) ? parsed.snapshot : undefined
  } catch {
    return undefined
  }
}

export function writeProviderFilterSnapshot(
  scope: ProviderFilterScope,
  snapshot: ProviderFilterSnapshot,
  storage: Storage | undefined = getSessionStorage(),
): void {
  if (!storage || !isProviderFilterSnapshot(scope, snapshot)) return

  const stored: StoredProviderFilterSnapshot = {
    schemaVersion: PROVIDER_FILTER_SESSION_SCHEMA_VERSION,
    snapshot,
  }

  try {
    storage.setItem(buildProviderFilterSessionKey(scope), JSON.stringify(stored))
  } catch {
    // Ignore unavailable or quota-exceeded session storage.
  }
}

export function clearProviderFilterSnapshot(
  scope: ProviderFilterScope,
  storage: Storage | undefined = getSessionStorage(),
): void {
  if (!storage) return

  try {
    storage.removeItem(buildProviderFilterSessionKey(scope))
  } catch {
    // Ignore unavailable session storage.
  }
}
