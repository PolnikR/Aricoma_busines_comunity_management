export type DashboardState = 'demo' | 'loading' | 'empty' | 'partial' | 'unknown'
export type SignalKind = 'critical' | 'warnings' | 'running' | 'unverified'
export interface DashboardSignal { id: string; kind: SignalKind }
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
export interface DashboardData {
  signals: DashboardSignal[]
  groups: { id: string; topology: 'local' | 'metro_mirror' }[]
  incidents: DashboardIncident[]
  activity: DashboardEvent[]
  infrastructure: DashboardResource[]
}
export interface DashboardCounts {
  critical: number
  warnings: number
  running: number
  unverified: number
  totalGroups: number
  local: number
  metro: number
}
export interface DashboardDetail { titleKey: string; descriptionKey: string; object?: string }
