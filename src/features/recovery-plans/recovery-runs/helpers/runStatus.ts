const NON_TERMINAL_RUN_STATUSES = new Set([
  'queued',
  'running',
  'scheduled',
  'up_for_retry',
  'up_for_reschedule',
  'deferred',
  'restarting',
])

export function isNonTerminalRunStatus(status: string): boolean {
  return NON_TERMINAL_RUN_STATUSES.has(status.toLowerCase())
}
