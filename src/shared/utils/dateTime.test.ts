import { describe, expect, it } from 'vitest'
import dateTimeSource from './dateTime.ts?raw'
import {
  DATE_FALLBACK,
  formatDate,
  formatDateTime,
  formatTime,
  getBrowserTimeZone,
  hasExplicitTimeZone,
  parseTimestamp,
  toDateLocale,
} from './dateTime'

const clock = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } as const
const INSTANT = Date.UTC(2026, 9, 6, 7, 41)

describe('parseTimestamp', () => {
  it('parses UTC and explicit-offset strings to the same instant', () => {
    expect(parseTimestamp('2026-10-06T07:41:00Z')?.getTime()).toBe(INSTANT)
    expect(parseTimestamp('2026-10-06T07:41:00+00:00')?.getTime()).toBe(INSTANT)
    expect(parseTimestamp('2026-10-06T09:41:00+02:00')?.getTime()).toBe(INSTANT)
    expect(parseTimestamp('2026-10-06T07:41:00.869196+00:00')?.getTime()).toBe(INSTANT + 869)
  })

  it('rejects naive and date-only strings instead of assuming a timezone', () => {
    expect(hasExplicitTimeZone('2026-08-18T09:46:40')).toBe(false)
    expect(parseTimestamp('2026-08-18T09:46:40')).toBeNull()
    expect(parseTimestamp('2026-10-06')).toBeNull()
  })

  it('rejects empty and invalid input', () => {
    for (const value of [null, undefined, '', 'not-a-date', '2026-13-45T99:99:00Z', new Date(Number.NaN)]) {
      expect(parseTimestamp(value)).toBeNull()
    }
  })

  it('accepts a valid Date as an absolute instant', () => {
    const date = new Date(INSTANT)
    expect(parseTimestamp(date)).toBe(date)
  })
})

describe('formatDateTime', () => {
  it('renders one instant in the wall-clock time of an explicit timezone', () => {
    expect(formatTime('2026-10-06T07:41:00Z', { ...clock, timeZone: 'Europe/Bratislava' })).toBe('09:41')
    expect(formatTime('2026-10-06T07:41:00Z', { ...clock, timeZone: 'Europe/London' })).toBe('08:41')
    expect(formatTime('2026-10-06T09:41:00+02:00', { ...clock, timeZone: 'Europe/London' })).toBe('08:41')
    expect(formatTime(new Date(INSTANT), { ...clock, timeZone: 'Europe/London' })).toBe('08:41')
  })

  it('applies DST through the IANA timezone', () => {
    expect(formatTime('2026-12-06T07:41:00Z', { ...clock, timeZone: 'Europe/Bratislava' })).toBe('08:41')
  })

  it('uses the browser timezone when no timeZone option is passed', () => {
    const value = '2026-10-06T07:41:00Z'
    expect(formatDateTime(value)).toBe(formatDateTime(value, { timeZone: getBrowserTimeZone() }))
    expect(formatDateTime(value, { language: 'sk' })).toBe(formatDateTime(value, { language: 'sk', timeZone: getBrowserTimeZone() }))
    expect(getBrowserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('returns the fallback for missing, invalid, naive and date-only values', () => {
    for (const value of [null, undefined, '', 'not-a-date', '2026-08-18T09:46:40', '2026-10-06']) {
      expect(formatDateTime(value)).toBe(DATE_FALLBACK)
      expect(formatDate(value)).toBe(DATE_FALLBACK)
      expect(formatTime(value)).toBe(DATE_FALLBACK)
    }
  })

  it('maps app languages to locales', () => {
    expect(toDateLocale('sk')).toBe('sk-SK')
    expect(toDateLocale('cs')).toBe('cs-CZ')
    expect(toDateLocale('en')).toBe('en-GB')
    expect(toDateLocale(undefined)).toBeUndefined()

    const value = '2026-10-06T07:41:00Z'
    for (const [language, locale] of [['sk', 'sk-SK'], ['cs', 'cs-CZ'], ['en', 'en-GB']] as const) {
      expect(formatDateTime(value, { language, timeZone: 'UTC' })).toBe(
        new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value)),
      )
    }
  })

  it('uses caller field options instead of the default styles', () => {
    expect(formatDateTime('2026-10-06T07:41:05Z', { language: 'en', timeZone: 'UTC', ...clock, second: '2-digit' })).toBe('07:41:05')
  })
})

describe('module source', () => {
  it('has no hardcoded timezone or fixed UTC offset', () => {
    expect(dateTimeSource).not.toContain('Europe/')
    expect(dateTimeSource).not.toMatch(/[+-]0\d:00/)
  })
})
