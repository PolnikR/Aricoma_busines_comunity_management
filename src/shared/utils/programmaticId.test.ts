import { describe, expect, it } from 'vitest'
import {
  generateProgrammaticId,
  isProgrammaticIdAvailable,
  toProgrammaticId,
} from './programmaticId'

describe('programmaticId', () => {
  it('normalizes spaces, accents, casing, and special characters', () => {
    expect(toProgrammaticId('  Web Skupína @ 1  ')).toBe('web_skupina_1')
  })

  it('detects normalized collisions while allowing the current id', () => {
    expect(isProgrammaticIdAvailable('Web Group', ['web_group'])).toBe(false)
    expect(isProgrammaticIdAvailable('Web Group', ['web_group'], 'web_group')).toBe(true)
  })

  it('generates the next available id', () => {
    expect(generateProgrammaticId('Web Group', ['web_group', 'web_group_2'])).toBe('web_group_3')
  })
})
