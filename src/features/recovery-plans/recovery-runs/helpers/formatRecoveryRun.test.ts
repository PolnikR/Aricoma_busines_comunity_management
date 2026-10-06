import { describe, expect, it } from 'vitest'
import { formatDateTime } from '@/shared/utils/dateTime'
import { formatRunDuration, formatRunTimestamp } from './formatRecoveryRun'

describe('formatRunTimestamp', () => {
  it('formats UTC-aware Airflow timestamps through the shared formatter', () => {
    expect(formatRunTimestamp('2026-08-18T09:46:40.607667Z')).toBe(formatDateTime('2026-08-18T09:46:40.607667Z'))
    expect(formatRunTimestamp('2026-08-18T09:46:40+00:00')).toBe(formatDateTime('2026-08-18T09:46:40Z'))
  })

  it('returns the fallback for missing, invalid and naive values', () => {
    expect(formatRunTimestamp(null)).toBe('—')
    expect(formatRunTimestamp('not-a-date')).toBe('—')
    expect(formatRunTimestamp('2026-08-18T09:46:40')).toBe('—')
  })
})

describe('formatRunDuration', () => {
  it('keeps the minutes/seconds format', () => {
    expect(formatRunDuration(252)).toBe('4m 12s')
    expect(formatRunDuration(42)).toBe('42s')
    expect(formatRunDuration(null)).toBe('—')
  })
})
