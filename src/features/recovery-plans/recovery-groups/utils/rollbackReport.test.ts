import { describe, expect, it } from 'vitest'
import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'
import { isRollbackClean } from './rollbackReport'

describe('isRollbackClean', () => {
  it('returns true when all statuses are ok and no errors', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok', dag_id: 'dag_123' },
      ibm: { status: 'ok', errors: [] },
    }
    expect(isRollbackClean(report)).toBe(true)
  })

  it('returns true when airflow and ibm are absent', () => {
    const report: RollbackReport = { status: 'ok' }
    expect(isRollbackClean(report)).toBe(true)
  })

  it('returns true when ibm.errors is absent', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok' },
      ibm: { status: 'ok' },
    }
    expect(isRollbackClean(report)).toBe(true)
  })

  it('returns false when report.status is not ok', () => {
    const report: RollbackReport = {
      status: 'failed',
      airflow: { status: 'ok' },
      ibm: { status: 'ok' },
    }
    expect(isRollbackClean(report)).toBe(false)
  })

  it('returns false when airflow.status is not ok', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'error' },
      ibm: { status: 'ok' },
    }
    expect(isRollbackClean(report)).toBe(false)
  })

  it('returns false when ibm.status is not ok', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok' },
      ibm: { status: 'partial' },
    }
    expect(isRollbackClean(report)).toBe(false)
  })

  it('returns false when ibm.errors is non-empty while all statuses are ok', () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok' },
      ibm: { status: 'ok', errors: ['volume orphaned'] },
    }
    expect(isRollbackClean(report)).toBe(false)
  })
})
