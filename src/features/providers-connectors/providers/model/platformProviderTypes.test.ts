import { describe, expect, it } from 'vitest'
import { PLATFORM_PROVIDER_TYPES } from './platformProviderTypes'

describe('PLATFORM_PROVIDER_TYPES', () => {
  it('contains only platform orchestration providers', () => {
    expect(PLATFORM_PROVIDER_TYPES).toEqual(['AIRFLOW'])
  })
})
