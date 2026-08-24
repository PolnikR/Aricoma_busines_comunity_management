import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { toRawRecordJson } from '@/shared/utils/rawRecordJson'

export function toPlatformProviderJson(provider: PlatformProviderRecord): object {
  return toRawRecordJson(provider)
}
