export type RunStatusBadgeColor = 'success' | 'info' | 'error' | 'light'

export function runStatusBadgeColor(status: string): RunStatusBadgeColor {
  const normalized = status.toLowerCase()
  if (normalized === 'success') return 'success'
  if (normalized === 'running') return 'info'
  if (normalized === 'failed') return 'error'
  return 'light'
}

export function formatRunTimestamp(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatRunDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return minutes > 0 ? `${String(minutes)}m ${String(remainingSeconds)}s` : `${String(remainingSeconds)}s`
}
