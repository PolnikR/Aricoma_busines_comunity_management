import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { getOverviewFootprint, NORMAL_MAX, WIDE_MAX } from './overviewLayout'

const text = (length: number) => 'x'.repeat(length)

describe('getOverviewFootprint', () => {
  it('uses the approved thresholds', () => {
    expect([NORMAL_MAX, WIDE_MAX]).toEqual([28, 64])
  })

  it.each([
    [1, 'normal'],
    [NORMAL_MAX, 'normal'],
    [NORMAL_MAX + 1, 'wide'],
    [WIDE_MAX, 'wide'],
    [WIDE_MAX + 1, 'full'],
  ])('sizes %i characters of plain text as %s', (length, footprint) => {
    expect(getOverviewFootprint(text(length), false)).toBe(footprint)
  })

  it('measures plain text and ignores wide', () => {
    expect(getOverviewFootprint(text(NORMAL_MAX), true)).toBe('normal')
    expect(getOverviewFootprint(text(WIDE_MAX + 1), true)).toBe('full')
  })

  it.each([null, undefined, '', '   ', ' '.repeat(WIDE_MAX + 1)])('keeps an empty value (%j) normal, even with wide', (value) => {
    expect(getOverviewFootprint(value, true)).toBe('normal')
  })

  it('makes a node full only with wide', () => {
    const link = createElement('a', { href: 'https://airflow.test' }, text(WIDE_MAX + 1))
    expect(getOverviewFootprint(link, false)).toBe('normal')
    expect(getOverviewFootprint(link, true)).toBe('full')
  })

  it('is not exported from the public barrel', async () => {
    const barrel = await import('./index')
    expect(Object.keys(barrel)).not.toContain('getOverviewFootprint')
  })
})
