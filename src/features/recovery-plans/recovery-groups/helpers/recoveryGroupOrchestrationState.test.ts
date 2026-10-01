import { describe, expect, it } from 'vitest'
import { getRecoveryGroupOrchestrationState, orchestrationMetaText, orchestrationSummaryText } from './recoveryGroupOrchestrationState'

const providers = { providers: [{ id: 'airflow-01', name: 'Airflow PROD' }], isLoading: false, isError: false }
const noLatest = { latestRun: null, isLoading: false, error: null }
const run = { runId: 'r1', status: 'success', startedAt: '2026-08-19T08:51:00Z', endedAt: '2026-08-19T08:51:07Z', durationSeconds: 7 }
const configured = { pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' }

describe('getRecoveryGroupOrchestrationState', () => {
  it('A: not orchestrated when push is off, whatever else is set', () => {
    expect(getRecoveryGroupOrchestrationState({ pushToOrchestrator: false }, providers, noLatest)).toEqual({ kind: 'notOrchestrated' })
    expect(getRecoveryGroupOrchestrationState({ ...configured, pushToOrchestrator: false }, providers, noLatest)).toEqual({ kind: 'notOrchestrated' })
    expect(getRecoveryGroupOrchestrationState({}, providers, noLatest)).toEqual({ kind: 'notOrchestrated' })
  })

  it('B: incomplete when push is on but the provider id is missing', () => {
    expect(getRecoveryGroupOrchestrationState({ pushToOrchestrator: true, orchestrationProviderId: null, airflowRunId: 'run-1' }, providers, noLatest))
      .toEqual({ kind: 'incomplete' })
  })

  it('C0: pending while the providers load', () => {
    expect(getRecoveryGroupOrchestrationState(configured, { ...providers, providers: [], isLoading: true }, noLatest))
      .toEqual({ kind: 'providersPending' })
  })

  it('C1: failed when the providers request failed', () => {
    expect(getRecoveryGroupOrchestrationState(configured, { ...providers, providers: [], isError: true }, noLatest))
      .toEqual({ kind: 'providersFailed' })
  })

  it('C: orchestrator unavailable when the provider is not in the loaded list', () => {
    expect(getRecoveryGroupOrchestrationState({ ...configured, orchestrationProviderId: 'airflow-gone' }, providers, noLatest))
      .toEqual({ kind: 'orchestratorUnavailable' })
  })

  it('D: no run id yet when the provider exists but no run id was assigned', () => {
    expect(getRecoveryGroupOrchestrationState({ ...configured, airflowRunId: null }, providers, noLatest))
      .toEqual({ kind: 'noRunId', providerName: 'Airflow PROD' })
  })

  it('E1: run pending while the latest run loads', () => {
    expect(getRecoveryGroupOrchestrationState(configured, providers, { ...noLatest, isLoading: true }))
      .toEqual({ kind: 'runPending', providerName: 'Airflow PROD' })
  })

  it('E2: run failed when the latest run request failed', () => {
    expect(getRecoveryGroupOrchestrationState(configured, providers, { ...noLatest, error: new Error('boom') }))
      .toEqual({ kind: 'runFailed', providerName: 'Airflow PROD' })
  })

  it('E3: no runs when there is no latest run', () => {
    expect(getRecoveryGroupOrchestrationState(configured, providers, noLatest))
      .toEqual({ kind: 'noRuns', providerName: 'Airflow PROD' })
  })

  it('E4: last run when a latest run exists', () => {
    expect(getRecoveryGroupOrchestrationState(configured, providers, { ...noLatest, latestRun: run }))
      .toEqual({ kind: 'lastRun', providerName: 'Airflow PROD', run })
  })
})

describe('orchestration texts', () => {
  const t = (key: string, params?: Record<string, string | number>) => (params ? `${key} ${JSON.stringify(params)}` : key)

  it('uses Not orchestrated / Not configured only for state A', () => {
    expect(orchestrationMetaText({ kind: 'notOrchestrated' }, t)).toBe('recoveryGroups.drawer.notOrchestrated')
    expect(orchestrationSummaryText({ kind: 'notOrchestrated' }, t)).toBe('recoveryGroups.drawer.notConfigured')
    for (const state of [
      { kind: 'incomplete' },
      { kind: 'orchestratorUnavailable' },
      { kind: 'noRunId', providerName: 'Airflow PROD' },
      { kind: 'noRuns', providerName: 'Airflow PROD' },
      { kind: 'lastRun', providerName: 'Airflow PROD', run },
    ] as const) {
      expect(orchestrationMetaText(state, t)).not.toMatch(/notOrchestrated|notConfigured/)
      expect(orchestrationSummaryText(state, t)).not.toMatch(/notOrchestrated|notConfigured/)
    }
  })

  it('maps each state to its meta fact and section summary', () => {
    expect(orchestrationMetaText({ kind: 'incomplete' }, t)).toBe('recoveryGroups.drawer.orchestrationIncomplete')
    expect(orchestrationMetaText({ kind: 'orchestratorUnavailable' }, t)).toBe('recoveryGroups.drawer.orchestratorUnavailable')
    expect(orchestrationMetaText({ kind: 'noRunId', providerName: 'P' }, t)).toBe('recoveryGroups.drawer.noRunId')
    expect(orchestrationMetaText({ kind: 'noRuns', providerName: 'P' }, t)).toBe('recoveryRuns.table.noRuns')
    expect(orchestrationMetaText({ kind: 'lastRun', providerName: 'P', run }, t)).toBe('recoveryGroups.drawer.lastRun {"status":"success","duration":"7s"}')
    for (const kind of ['providersPending', 'providersFailed'] as const) {
      expect(orchestrationMetaText({ kind }, t)).toBeNull()
      expect(orchestrationSummaryText({ kind }, t)).toBeUndefined()
    }
    for (const kind of ['runPending', 'runFailed'] as const) {
      expect(orchestrationMetaText({ kind, providerName: 'P' }, t)).toBeNull()
      expect(orchestrationSummaryText({ kind, providerName: 'P' }, t)).toBe('P')
    }
    expect(orchestrationSummaryText({ kind: 'incomplete' }, t)).toBe('recoveryGroups.drawer.orchestrationIncomplete')
    expect(orchestrationSummaryText({ kind: 'orchestratorUnavailable' }, t)).toBe('recoveryGroups.drawer.orchestratorUnavailable')
  })
})
