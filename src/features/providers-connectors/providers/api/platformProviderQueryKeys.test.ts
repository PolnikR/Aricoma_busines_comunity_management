import { describe, expect, it } from 'vitest'
import { platformProviderKeys } from './platformProviderQueryKeys'

describe('platformProviderKeys', () => {
  it('keeps platform-provider cache separate from infrastructure providers', () => {
    expect(platformProviderKeys.all).toEqual(['platform-providers'])
    expect(platformProviderKeys.list()).toEqual(['platform-providers', 'list'])
  })
})
