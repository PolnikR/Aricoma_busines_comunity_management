// Design-exploration mock data for the dashboard preview. Not a backend contract:
// every number here is a hand-picked test value, nothing is derived or fetched.
import type { StateTone } from '@/shared/components/data-table'

export type RunStatus = 'success' | 'failed' | 'running' | 'queued'

export interface StatusSlice {
  label: string
  value: number
  tone: StateTone
}

export interface HealthRow {
  id: string
  label: string
  total: number
  summary: string
  tone: StateTone
  slices: StatusSlice[]
  drillTo: string
}

export interface AttentionItem {
  id: string
  severity: 'error' | 'warn'
  category: string
  title: string
  subject: string
  detail: string
  age: string
  actionLabel: string
}

export interface ActivityDay {
  day: string
  successful: number
  failed: number
  running: number
}

export interface RecentRun {
  id: string
  name: string
  type: 'Recovery Group' | 'Recovery Application'
  action: string
  status: RunStatus
  startedAt: string
  durationSeconds: number | null
}

export interface ProviderStatus {
  id: string
  name: string
  kind: string
  tone: StateTone
  status: string
  lastDiscovery: string
}

export interface PerformanceMetric {
  id: string
  label: string
  value: string
  unit: string
  points: number[]
}

export const mockDashboardData = {
  generatedAt: 'Oct 6, 2026, 10:24 AM',
  inventory: {
    virtualMachines: 142,
    runningVms: 131,
    vmDisks: 387,
    storageVolumes: 214,
    protectedVolumes: 198,
    recoveryGroups: 18,
    localRecoveryGroups: 14,
    remoteRecoveryGroups: 4,
    providers: 7,
    healthyProviders: 6,
    activeRecoveryRuns: 3,
    snapshots: 563,
    consistencyGroups: 27,
    metroMirrorRelationships: 12,
    healthyMetroMirrorRelationships: 11,
  },
  protection: {
    protectedVms: 126,
    totalVms: 142,
    coveragePercent: 88.7,
    slices: [
      { label: 'Local snapshots', value: 98, tone: 'on' },
      { label: 'Metro Mirror', value: 28, tone: 'on' },
      { label: 'Unprotected', value: 16, tone: 'warn' },
    ] satisfies StatusSlice[],
  },
  recoveryActivity: {
    totals: { successful: 41, failed: 3, running: 2, queued: 1 },
    successRatePercent: 93.2,
    days: [
      { day: 'Tue', successful: 5, failed: 0, running: 0 },
      { day: 'Wed', successful: 7, failed: 1, running: 0 },
      { day: 'Thu', successful: 6, failed: 0, running: 0 },
      { day: 'Fri', successful: 8, failed: 0, running: 0 },
      { day: 'Sat', successful: 3, failed: 0, running: 0 },
      { day: 'Sun', successful: 4, failed: 0, running: 0 },
      { day: 'Today', successful: 8, failed: 2, running: 2 },
    ] satisfies ActivityDay[],
  },
  health: [
    {
      id: 'vms',
      label: 'Virtual machines',
      total: 142,
      summary: '131 running',
      tone: 'warn',
      slices: [
        { label: 'Running', value: 131, tone: 'on' },
        { label: 'Warning', value: 2, tone: 'warn' },
        { label: 'Powered off', value: 9, tone: 'off' },
      ],
      drillTo: 'Inventory → VM',
    },
    {
      id: 'volumes',
      label: 'Storage volumes',
      total: 214,
      summary: '209 online',
      tone: 'error',
      slices: [
        { label: 'Online', value: 209, tone: 'on' },
        { label: 'Degraded', value: 4, tone: 'warn' },
        { label: 'Offline', value: 1, tone: 'error' },
      ],
      drillTo: 'Inventory → Volumes',
    },
    {
      id: 'providers',
      label: 'Providers',
      total: 7,
      summary: '6 healthy',
      tone: 'error',
      slices: [
        { label: 'Healthy', value: 6, tone: 'on' },
        { label: 'Unreachable', value: 1, tone: 'error' },
      ],
      drillTo: 'Providers & connectors',
    },
    {
      id: 'metro-mirror',
      label: 'Metro Mirror relationships',
      total: 12,
      summary: '11 consistent',
      tone: 'warn',
      slices: [
        { label: 'Consistent', value: 11, tone: 'on' },
        { label: 'Degraded', value: 1, tone: 'warn' },
      ],
      drillTo: 'Inventory → Metro Mirror',
    },
    {
      id: 'consistency-groups',
      label: 'Consistency groups',
      total: 27,
      summary: '27 consistent',
      tone: 'on',
      slices: [
        { label: 'Consistent', value: 27, tone: 'on' },
      ],
      drillTo: 'Inventory → Consistency groups',
    },
  ] satisfies HealthRow[],
  attention: [
    {
      id: 'run-erp',
      severity: 'error',
      category: 'Recovery run',
      title: 'Failover failed',
      subject: 'erp-prod-tier1',
      detail: 'Step "Promote volumes" failed on fs9500-brno',
      age: '14 min ago',
      actionLabel: 'Open run',
    },
    {
      id: 'run-crm',
      severity: 'error',
      category: 'Recovery run',
      title: 'Test failover failed',
      subject: 'crm-web-frontend',
      detail: 'VM crm-web-03 did not power on within 600 s',
      age: '1 h ago',
      actionLabel: 'Open run',
    },
    {
      id: 'provider-vc',
      severity: 'error',
      category: 'Provider',
      title: 'Provider unreachable',
      subject: 'vc-ostrava-02',
      detail: 'vCenter API timeout, last successful discovery 3 h ago',
      age: '3 h ago',
      actionLabel: 'Open provider',
    },
    {
      id: 'mm-sql',
      severity: 'warn',
      category: 'Metro Mirror',
      title: 'Relationship degraded',
      subject: 'mm-rel-sql-07',
      detail: 'State consistent_copying, secondary 4 min behind',
      age: '26 min ago',
      actionLabel: 'Open relationship',
    },
  ] satisfies AttentionItem[],
  recentRuns: [
    { id: 'r-1', name: 'erp-prod-tier1', type: 'Recovery Application', action: 'Failover', status: 'failed', startedAt: '2026-10-06T10:02:00+02:00', durationSeconds: 412 },
    { id: 'r-2', name: 'sap-hana-cluster', type: 'Recovery Group', action: 'Snapshot restore', status: 'running', startedAt: '2026-10-06T10:11:00+02:00', durationSeconds: null },
    { id: 'r-3', name: 'fileserver-brno', type: 'Recovery Group', action: 'Test failover', status: 'running', startedAt: '2026-10-06T10:18:00+02:00', durationSeconds: null },
    { id: 'r-4', name: 'mail-exchange', type: 'Recovery Group', action: 'Test failover', status: 'queued', startedAt: '2026-10-06T10:21:00+02:00', durationSeconds: null },
    { id: 'r-5', name: 'crm-web-frontend', type: 'Recovery Application', action: 'Test failover', status: 'failed', startedAt: '2026-10-06T09:20:00+02:00', durationSeconds: 655 },
    { id: 'r-6', name: 'db_and_app', type: 'Recovery Group', action: 'Snapshot restore', status: 'success', startedAt: '2026-10-06T09:30:00+02:00', durationSeconds: 128 },
    { id: 'r-7', name: 'payroll-batch', type: 'Recovery Application', action: 'Test failover', status: 'success', startedAt: '2026-10-06T07:45:00+02:00', durationSeconds: 904 },
    { id: 'r-8', name: 'dwh-reporting', type: 'Recovery Group', action: 'Snapshot restore', status: 'success', startedAt: '2026-10-05T22:10:00+02:00', durationSeconds: 341 },
  ] satisfies RecentRun[],
  providers: [
    { id: 'p-1', name: 'vc-brno-01', kind: 'VMware vCenter', tone: 'on', status: 'Healthy', lastDiscovery: '6 min ago' },
    { id: 'p-2', name: 'vc-ostrava-02', kind: 'VMware vCenter', tone: 'error', status: 'Unreachable', lastDiscovery: '3 h ago' },
    { id: 'p-3', name: 'vc-praha-dr', kind: 'VMware vCenter', tone: 'on', status: 'Healthy', lastDiscovery: '8 min ago' },
    { id: 'p-4', name: 'fs9500-brno', kind: 'IBM FlashSystem', tone: 'on', status: 'Healthy', lastDiscovery: '4 min ago' },
    { id: 'p-5', name: 'fs9500-praha', kind: 'IBM FlashSystem', tone: 'on', status: 'Healthy', lastDiscovery: '4 min ago' },
    { id: 'p-6', name: 'ise-brno', kind: 'Cisco ISE', tone: 'on', status: 'Healthy', lastDiscovery: '12 min ago' },
    { id: 'p-7', name: 'airflow-core', kind: 'Orchestrator', tone: 'on', status: 'Healthy', lastDiscovery: '1 min ago' },
  ] satisfies ProviderStatus[],
  storage: [
    { id: 'disks', label: 'VM disks', value: 387, detail: '2.1 disks per VM', drillTo: 'Inventory → VM disks' },
    { id: 'volumes', label: 'Volumes', value: 214, detail: '198 protected', drillTo: 'Inventory → Volumes' },
    { id: 'snapshots', label: 'Snapshots', value: 563, detail: '48 taken in last 24 h', drillTo: 'Inventory → Snapshots' },
    { id: 'cgs', label: 'Consistency groups', value: 27, detail: 'All consistent', drillTo: 'Inventory → Consistency groups' },
  ],
  // 14-day trend series for the status board rows.
  trends: {
    protection: [84.1, 84.5, 85.2, 85.2, 86.0, 86.3, 86.3, 87.1, 87.4, 87.9, 88.0, 88.3, 88.7, 88.7],
    recovery: [96, 100, 94, 100, 97, 92, 100, 100, 87, 100, 100, 100, 100, 80],
    compute: [134, 135, 135, 137, 138, 138, 139, 140, 140, 141, 141, 142, 142, 142],
    storage: [205, 206, 206, 208, 209, 210, 210, 211, 212, 212, 213, 214, 214, 214],
    replication: [12, 12, 12, 12, 12, 11, 12, 12, 12, 12, 12, 12, 12, 11],
    providers: [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6],
  },
  // Placeholder only: these performance metrics are not available yet.
  performance: [
    { id: 'cpu', label: 'CPU utilization', value: '42', unit: '%', points: [38, 41, 40, 44, 47, 43, 42, 45, 41, 42] },
    { id: 'memory', label: 'Memory utilization', value: '61', unit: '%', points: [58, 59, 60, 60, 62, 61, 63, 62, 61, 61] },
    { id: 'iops', label: 'IOPS', value: '18.4', unit: 'k', points: [14, 16, 15, 19, 22, 18, 17, 20, 19, 18] },
    { id: 'latency', label: 'Latency', value: '1.8', unit: 'ms', points: [1.6, 1.7, 1.9, 2.4, 2.0, 1.8, 1.7, 1.9, 1.8, 1.8] },
    { id: 'throughput', label: 'Throughput', value: '2.1', unit: 'GB/s', points: [1.6, 1.8, 2.0, 2.3, 2.2, 1.9, 2.1, 2.4, 2.0, 2.1] },
    { id: 'api', label: 'API latency', value: '120', unit: 'ms', points: [110, 115, 140, 125, 118, 122, 130, 119, 121, 120] },
  ] satisfies PerformanceMetric[],
}

export type DashboardData = typeof mockDashboardData
