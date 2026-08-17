import { describe, expect, it } from 'vitest'
import { formatCapacityBytes, parseCapacityBytes } from './parseCapacity'

describe('parseCapacityBytes', () => {
  it('parses explicit storage units and rejects ambiguous values', () => {
    expect(parseCapacityBytes('6.98TB')).toBe(6_980_000_000_000)
    expect(parseCapacityBytes('898.00GB')).toBe(898_000_000_000)
    expect(parseCapacityBytes('0.00MB')).toBe(0)
    expect(parseCapacityBytes('270648')).toBeNull()
    expect(parseCapacityBytes('-')).toBeNull()
  })

  it('formats aggregate bytes without inventing a value for zero', () => {
    expect(formatCapacityBytes(6_980_000_000_000)).toBe('6.98 TB')
    expect(formatCapacityBytes(0)).toBe('0 B')
  })
})
