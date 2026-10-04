import type { CacheConfigResponseOutput, CacheConfigUpdate } from '@/generated/query/zod'

export interface DiscoveryCacheConfigDraft {
  defaults: Record<string, string>
  historyRetention: {
    retentionDays: string
    maxRecords: string
  }
}

export interface DiscoveryCacheConfigDraftValidation {
  isValid: boolean
  errors: {
    defaults: Record<string, string>
    historyRetention: {
      retentionDays?: string
      maxRecords?: string
    }
  }
}

const knownProviderTypes = ['VMWARE', 'FLASHCOPY', 'IBM_POWER'] as const
const positiveWholeNumber = /^[1-9]\d*$/
const positiveWholeNumberError = 'Enter a positive whole number.'

export function createDiscoveryCacheConfigDraft(config: CacheConfigResponseOutput): DiscoveryCacheConfigDraft {
  return {
    defaults: Object.fromEntries(Object.entries(config.defaults).map(([key, value]) => [key, String(value)])),
    historyRetention: {
      retentionDays: String(config.history_retention.retention_days),
      maxRecords: String(config.history_retention.max_records),
    },
  }
}

export function getOrderedDiscoveryCacheDefaultKeys(defaults: Record<string, unknown>): string[] {
  const known = knownProviderTypes.filter(key => key in defaults)
  const unknown = Object.keys(defaults).filter(key => !knownProviderTypes.includes(key as typeof knownProviderTypes[number])).sort()
  return [...known, ...unknown]
}

export function validateDiscoveryCacheConfigDraft(draft: DiscoveryCacheConfigDraft): DiscoveryCacheConfigDraftValidation {
  const errors: DiscoveryCacheConfigDraftValidation['errors'] = { defaults: {}, historyRetention: {} }
  for (const [key, value] of Object.entries(draft.defaults)) {
    if (!positiveWholeNumber.test(value)) errors.defaults[key] = positiveWholeNumberError
  }
  if (!positiveWholeNumber.test(draft.historyRetention.retentionDays)) errors.historyRetention.retentionDays = positiveWholeNumberError
  if (!positiveWholeNumber.test(draft.historyRetention.maxRecords)) errors.historyRetention.maxRecords = positiveWholeNumberError

  return { isValid: Object.keys(errors.defaults).length === 0 && Object.keys(errors.historyRetention).length === 0, errors }
}

export function toDiscoveryCacheConfigPatch(draft: DiscoveryCacheConfigDraft, baseline: CacheConfigResponseOutput): CacheConfigUpdate | null {
  const changedDefaults = Object.fromEntries(
    Object.entries(draft.defaults)
      .map(([key, value]) => [key, Number(value)] as const)
      .filter(([key, value]) => baseline.defaults[key] !== value),
  )
  const historyRetentionPatch: NonNullable<CacheConfigUpdate['history_retention']> = {}
  const retentionDays = Number(draft.historyRetention.retentionDays)
  const maxRecords = Number(draft.historyRetention.maxRecords)
  if (baseline.history_retention.retention_days !== retentionDays) historyRetentionPatch.retention_days = retentionDays
  if (baseline.history_retention.max_records !== maxRecords) historyRetentionPatch.max_records = maxRecords

  if (Object.keys(changedDefaults).length === 0 && Object.keys(historyRetentionPatch).length === 0) return null
  return {
    ...(Object.keys(changedDefaults).length > 0 ? { defaults: changedDefaults } : {}),
    ...(Object.keys(historyRetentionPatch).length > 0 ? { history_retention: historyRetentionPatch } : {}),
  }
}

export function isDiscoveryCacheConfigDraftDirty(draft: DiscoveryCacheConfigDraft, baseline: CacheConfigResponseOutput): boolean {
  const defaultKeys = Object.keys(baseline.defaults)
  if (Object.keys(draft.defaults).length !== defaultKeys.length) return true
  if (defaultKeys.some(key => draft.defaults[key] !== String(baseline.defaults[key]))) return true
  return draft.historyRetention.retentionDays !== String(baseline.history_retention.retention_days)
    || draft.historyRetention.maxRecords !== String(baseline.history_retention.max_records)
}
