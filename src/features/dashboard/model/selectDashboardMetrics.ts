import type { DashboardCounts, DashboardData } from './dashboardTypes'

export function selectDashboardMetrics(data: DashboardData | null): DashboardCounts | null {
  if (!data) return null
  return {
    failedSnapshotJobs: data.issues.filter(issue => issue.kind === 'failedSnapshotJobs').length,
    metroMirrorIssues: data.issues.filter(issue => issue.kind === 'metroMirrorIssues').length,
    connectionFailures: data.issues.filter(issue => issue.kind === 'connectionFailures').length,
    missingVolumes: data.issues.filter(issue => issue.kind === 'missingVolumes').length,
    totalGroups: data.groups.length,
    local: data.groups.filter(group => group.topology === 'local').length,
    metro: data.groups.filter(group => group.topology === 'metro_mirror').length,
  }
}
