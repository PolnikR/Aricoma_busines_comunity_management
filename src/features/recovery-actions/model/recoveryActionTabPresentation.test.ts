import { describe, expect, it } from 'vitest'
import {
  buildRecoveryActionTabPresentation,
  type RecoveryActionTabPresentationInput,
} from './recoveryActionTabPresentation'
import {
  initialRecoverySchedule,
  latestAutomatedRun,
  latestValidationChecks,
  recoveryApplicationGroups,
  recoveryHistory,
} from '../mocks/recoveryActionsMocks'

const input: RecoveryActionTabPresentationInput = {
  latestAutomatedRun,
  latestValidationChecks,
  applicationGroupCount: recoveryApplicationGroups.length,
  schedule: initialRecoverySchedule,
  historyCount: recoveryHistory.length,
  evidenceWindowDays: 30,
}

describe('buildRecoveryActionTabPresentation', () => {
  it('derives a warning count and latest-check detail for Validate', () => {
    const presentation = buildRecoveryActionTabPresentation(input).validate

    expect(presentation.status.tone).toBe('warning')
    expect(presentation.status.labelKey).toBe('pages.recoveryActions.tabStatus.issue')
    expect(presentation.status.params).toEqual({ count: 1 })
    expect(presentation.detail.key).toBe('pages.recoveryActions.tabDetail.latestCheck')
    expect(presentation.detail.params).toEqual({ date: latestAutomatedRun.startedAt })
  })

  it('derives schedule and history context from the configured mocks', () => {
    const presentation = buildRecoveryActionTabPresentation(input)

    expect(presentation.schedule.status.labelKey).toBe('pages.recoveryActions.tabStatus.weekly')
    expect(presentation.schedule.detail.params).toEqual({ day: 'Sunday', time: '22:00' })
    expect(presentation.history.status.params).toEqual({ count: recoveryHistory.length })
    expect(presentation.history.detail.params).toEqual({ days: 30 })
  })
})
