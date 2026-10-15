import type { DashboardCounts, DashboardData } from './dashboardTypes'

export function selectDashboardMetrics(data: DashboardData | null): DashboardCounts | null {
  if (!data) return null
  return {
    protectionAtRisk: data.issues.filter(issue => issue.kind === 'protectionAtRisk').length,
    replicationIssues: data.issues.filter(issue => issue.kind === 'replicationIssues').length,
    connectionFailures: data.issues.filter(issue => issue.kind === 'connectionFailures').length,
    inventoryIssues: data.issues.filter(issue => issue.kind === 'inventoryIssues').length,
    totalGroups: data.groups.length,
    local: data.groups.filter(group => group.topology === 'local').length,
    metro: data.groups.filter(group => group.topology === 'metro_mirror').length,
  }
}
