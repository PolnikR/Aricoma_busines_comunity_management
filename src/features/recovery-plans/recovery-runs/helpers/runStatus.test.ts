import { describe, expect, it } from 'vitest'
import { isNonTerminalRunStatus } from './runStatus'

describe('isNonTerminalRunStatus', () => {
  it.each(['queued', 'running', 'scheduled', 'up_for_retry', 'up_for_reschedule', 'deferred', 'restarting'])(
    'recognizes %s as active',
    status => {
      expect(isNonTerminalRunStatus(status)).toBe(true)
    },
  )

  it.each(['success', 'failed', 'cancelled', 'canceled', 'skipped', 'upstream_failed', 'removed', 'shutdown', 'unknown', ''])(
    'does not poll for %s',
    status => {
      expect(isNonTerminalRunStatus(status)).toBe(false)
    },
  )
})
