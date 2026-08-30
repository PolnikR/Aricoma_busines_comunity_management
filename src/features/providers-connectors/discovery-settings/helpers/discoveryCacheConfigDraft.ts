import type { DiscoveryCacheConfig, DiscoveryCacheConfigPatch } from '../model/discoveryCacheTypes'

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

export function createDiscoveryCacheConfigDraft(config: DiscoveryCacheConfig): DiscoveryCacheConfigDraft {
  return {
    defaults: Object.fromEntries(Object.entries(config.defaults).map(([key, value]) => [key, String(value)])),
    historyRetention: {
      retentionDays: String(config.historyRetention.retentionDays),
      maxRecords: String(config.historyRetention.maxRecords),
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

export function toDiscoveryCacheConfigPatch(draft: DiscoveryCacheConfigDraft, baseline: DiscoveryCacheConfig): DiscoveryCacheConfigPatch | null {
  const changedDefaults = Object.fromEntries(
    Object.entries(draft.defaults)
      .map(([key, value]) => [key, Number(value)] as const)
      .filter(([key, value]) => baseline.defaults[key] !== value),
  )
  const historyRetention: NonNullable<DiscoveryCacheConfigPatch['historyRetention']> = {}
  const retentionDays = Number(draft.historyRetention.retentionDays)
  const maxRecords = Number(draft.historyRetention.maxRecords)
  if (baseline.historyRetention.retentionDays !== retentionDays) historyRetention.retentionDays = retentionDays
  if (baseline.historyRetention.maxRecords !== maxRecords) historyRetention.maxRecords = maxRecords

  if (Object.keys(changedDefaults).length === 0 && Object.keys(historyRetention).length === 0) return null
  return {
    ...(Object.keys(changedDefaults).length > 0 ? { defaults: changedDefaults } : {}),
    ...(Object.keys(historyRetention).length > 0 ? { historyRetention } : {}),
  }
}

export function isDiscoveryCacheConfigDraftDirty(draft: DiscoveryCacheConfigDraft, baseline: DiscoveryCacheConfig): boolean {
  const defaultKeys = Object.keys(baseline.defaults)
  if (Object.keys(draft.defaults).length !== defaultKeys.length) return true
  if (defaultKeys.some(key => draft.defaults[key] !== String(baseline.defaults[key]))) return true
  return draft.historyRetention.retentionDays !== String(baseline.historyRetention.retentionDays)
    || draft.historyRetention.maxRecords !== String(baseline.historyRetention.maxRecords)
}
