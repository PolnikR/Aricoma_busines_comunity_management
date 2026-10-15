import { describe, expect, it } from 'vitest'
import { dashboardFixture } from '../mocks/dashboardFixtures'
import { selectDashboardMetrics } from './selectDashboardMetrics'

describe('approved Overview sample data', () => {
  it('derives KPI and topology counts from one consistent fixture', () => {
    expect(selectDashboardMetrics(dashboardFixture)).toEqual({ failedSnapshotJobs: 3, replicationIssues: 7, connectionFailures: 4, missingVolumes: 5, totalGroups: 24, local: 16, metro: 8 })
    expect(dashboardFixture.incidents).toHaveLength(3)
    expect(dashboardFixture.activity).toHaveLength(3)
    expect(dashboardFixture.infrastructure.map(resource => [resource.total, resource.selected])).toEqual([[128, 108], [32, 30], [186, 178], [94, 91]])
  })
  it('keeps missing inputs unknown instead of claiming zero issues', () => {
    expect(selectDashboardMetrics(null)).toBeNull()
    expect(selectDashboardMetrics({ ...dashboardFixture, issues: [], groups: [] })).toMatchObject({ failedSnapshotJobs: 0, replicationIssues: 0, connectionFailures: 0, missingVolumes: 0, totalGroups: 0 })
  })
})
