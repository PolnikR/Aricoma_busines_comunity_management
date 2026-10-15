import type { DashboardData, DashboardIssueKind } from '../model/dashboardTypes'

// Illustrative operational counts only; no live API collection is connected.
// Each entry represents a distinct failed Recovery Group, affected replication Recovery Group (Metro Mirror / TrueCopy),
// failed provider or missing provider-volume pair; see the BE specification.
const issues: { kind: DashboardIssueKind; count: number }[] = [{ kind: 'failedSnapshotJobs', count: 3 }, { kind: 'replicationIssues', count: 7 }, { kind: 'connectionFailures', count: 4 }, { kind: 'missingVolumes', count: 5 }]
export const dashboardFixture = {
  issues: issues.flatMap(({ kind, count }) => Array.from({ length: count }, (_, i) => ({ id: `${kind}-${String(i)}`, kind }))),
  groups: Array.from({ length: 24 }, (_, i) => ({ id: `group-${String(i)}`, topology: i < 16 ? 'local' : 'metro_mirror' })),
  incidents: [
    { id: 'incident-vm', severity: 'critical', titleKey: 'incidentVm', object: 'abco-prg-01-web-01', summaryKey: 'incidentVmSummary', timestamp: '2026-10-22T10:24:00+02:00', detailKey: 'incidentVmDetail' },
    { id: 'incident-mirror', severity: 'warning', titleKey: 'incidentMirror', object: 'finance-rg-01', summaryKey: 'incidentMirrorSummary', timestamp: '2026-10-22T08:17:00+02:00', detailKey: 'incidentMirrorDetail' },
    { id: 'incident-capacity', severity: 'critical', titleKey: 'incidentCapacity', object: 'fs-vol-032', summaryKey: 'incidentCapacitySummary', timestamp: '2026-10-21T16:03:00+02:00', detailKey: 'incidentCapacityDetail' },
  ],
  activity: [
    { id: 'event-success', tone: 'success', titleKey: 'eventSuccess', object: 'web-tier-failover', summaryKey: 'eventSuccessSummary', timestamp: '2026-10-22T11:36:00+02:00', detailKey: 'eventSuccessDetail' },
    { id: 'event-running', tone: 'info', titleKey: 'eventRunning', object: 'db-tier-failover', summaryKey: 'eventRunningSummary', timestamp: '2026-10-22T09:14:00+02:00', detailKey: 'eventRunningDetail' },
    { id: 'event-discovery', tone: 'neutral', titleKey: 'eventDiscovery', object: 'VMware inventory', summaryKey: 'eventDiscoverySummary', timestamp: '2026-10-21T18:27:00+02:00', detailKey: 'eventDiscoveryDetail' },
  ],
  infrastructure: [
    { id: 'vmware', titleKey: 'vmware', technology: 'VMware', total: 128, selected: 108, unitKey: 'totalVms', metricKey: 'poweredOn', detailKey: 'vmwareDetail' },
    { id: 'power', titleKey: 'power', technology: 'IBM Power', total: 32, selected: 30, unitKey: 'totalPartitions', metricKey: 'active', detailKey: 'powerDetail' },
    { id: 'flash', titleKey: 'flash', technology: 'IBM FlashSystem', total: 186, selected: 178, unitKey: 'totalVolumes', metricKey: 'available', detailKey: 'flashDetail' },
    { id: 'hitachi', titleKey: 'hitachi', technology: 'Hitachi VSP', total: 94, selected: 91, unitKey: 'totalVolumes', metricKey: 'available', detailKey: 'hitachiDetail' },
  ],
} satisfies DashboardData
