import type { DashboardCounts, DashboardData } from './dashboardTypes'

export function selectDashboardMetrics(data: DashboardData | null): DashboardCounts | null {
  if (!data) return null
  return {
    critical: data.signals.filter(signal => signal.kind === 'critical').length,
    warnings: data.signals.filter(signal => signal.kind === 'warnings').length,
    running: data.signals.filter(signal => signal.kind === 'running').length,
    unverified: data.signals.filter(signal => signal.kind === 'unverified').length,
    totalGroups: data.groups.length,
    local: data.groups.filter(group => group.topology === 'local').length,
    metro: data.groups.filter(group => group.topology === 'metro_mirror').length,
  }
}
