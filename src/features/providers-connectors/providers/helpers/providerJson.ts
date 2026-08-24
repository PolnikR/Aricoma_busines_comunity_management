import type { ProviderRecord } from '../model/providerTypes'
import { toRawRecordJson } from '@/shared/utils/rawRecordJson'

export function toProviderJson(provider: ProviderRecord): object {
  return toRawRecordJson(provider)
}
