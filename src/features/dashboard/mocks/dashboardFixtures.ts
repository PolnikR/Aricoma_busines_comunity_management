import type { DashboardData, SignalKind } from '../model/dashboardTypes'

// Only the approved operations HTML is the source of these illustrative values.
// These signals are not derived from inventory/configuration health or live APIs.
const signals: { kind: SignalKind; count: number }[] = [{ kind: 'critical', count: 3 }, { kind: 'warnings', count: 7 }, { kind: 'running', count: 4 }, { kind: 'unverified', count: 5 }]
export const dashboardFixture = {
  signals: signals.flatMap(({ kind, count }) => Array.from({ length: count }, (_, i) => ({ id: `${kind}-${String(i)}`, kind }))),
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
