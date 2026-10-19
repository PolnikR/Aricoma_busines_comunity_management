export type DashboardState = 'demo' | 'loading' | 'empty' | 'partial' | 'unknown'
export type DashboardDensity = 'auto' | 'compact' | 'spacious'
export type DashboardIssueKind = 'failedSnapshotJobs' | 'replicationIssues' | 'connectionFailures' | 'missingVolumes'
// Each mock issue represents one affected object in the relevant KPI unit.
export interface DashboardIssue { id: string; kind: DashboardIssueKind }
export interface DashboardIncident {
  id: string
  severity: 'critical' | 'warning'
  titleKey: string
  object: string
  summaryKey: string
  timestamp: string
  detailKey: string
}
export interface DashboardEvent {
  id: string
  tone: 'success' | 'info' | 'neutral'
  titleKey: string
  object: string
  summaryKey: string
  timestamp: string
  detailKey: string
}
export interface DashboardResource {
  id: 'vmware' | 'power' | 'flash' | 'hitachi'
  titleKey: string
  technology: string
  total: number
  selected: number
  unitKey: string
  metricKey: string
  detailKey: string
}
export interface DashboardRecoveryApplication { id: string; platform: 'VMWARE' | 'IBM_POWER'; deployed: boolean }
export interface DashboardSnapshotSummary { flashCopyMappings: number; groupsWithSnapshotPolicy: number }
export interface DashboardData {
  applications?: DashboardRecoveryApplication[]
  snapshotSummary?: DashboardSnapshotSummary
  issues: DashboardIssue[]
  groups: { id: string; topology: 'local' | 'metro_mirror' }[]
  incidents: DashboardIncident[]
  activity: DashboardEvent[]
  infrastructure: DashboardResource[]
}
export interface DashboardCounts {
  failedSnapshotJobs: number
  replicationIssues: number
  connectionFailures: number
  missingVolumes: number
  totalGroups: number
  local: number
  metro: number
}
export interface DashboardDetail { titleKey: string; descriptionKey: string; object?: string }
