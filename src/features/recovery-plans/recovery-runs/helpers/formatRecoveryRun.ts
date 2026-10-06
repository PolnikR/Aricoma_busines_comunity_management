import { formatDateTime } from '@/shared/utils/dateTime'

export type RunStatusBadgeColor = 'success' | 'info' | 'error' | 'light'

export function runStatusBadgeColor(status: string): RunStatusBadgeColor {
  const normalized = status.toLowerCase()
  if (normalized === 'success') return 'success'
  if (normalized === 'running') return 'info'
  if (normalized === 'failed') return 'error'
  return 'light'
}

// Browser default locale (no `language`), as before. Airflow timestamps are proxied by the BE without
// normalization, so they get the same strict check as any other value: naive strings render as '—'.
export function formatRunTimestamp(value: string | null): string {
  return formatDateTime(value)
}

export function formatRunDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return minutes > 0 ? `${String(minutes)}m ${String(remainingSeconds)}s` : `${String(remainingSeconds)}s`
}
