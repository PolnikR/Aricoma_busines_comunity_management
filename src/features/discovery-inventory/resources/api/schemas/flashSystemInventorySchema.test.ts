import { describe, expect, it } from 'vitest'
import { flashSystemInventoryResponseSchema } from './flashSystemInventorySchema'

describe('flashSystemInventoryResponseSchema', () => {
  it('accepts nullable provider IDs returned by get_volumes', () => {
    const parsed = flashSystemInventoryResponseSchema.parse({
      provider_id: null,
      count: 1,
      volumes: [{ name: 'volume-01', provider_id: null }],
      pools: {},
      hosts: {},
      clusters: {},
    })

    expect(parsed.provider_id).toBeNull()
    expect(parsed.volumes[0]?.provider_id).toBeNull()
  })
})
