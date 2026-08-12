import type {
  RecoveryApplicationGroup,
  RecoveryNotificationRecipient,
  RecoveryPoint,
  RecoveryScheduleSettings,
  RecoveryTestRun,
  ValidationCheck,
} from '../model/recoveryActionTypes'

export const recoveryApplicationGroups: RecoveryApplicationGroup[] = [
  { id: 'erp-production', name: 'Production ERP', environment: 'Production', applicationCount: 3, resourceCount: 18 },
  { id: 'customer-portal', name: 'Customer Portal', environment: 'Production', applicationCount: 2, resourceCount: 11 },
  { id: 'finance-uat', name: 'Finance UAT', environment: 'UAT', applicationCount: 2, resourceCount: 8 },
]

export const latestRecoveryPoint: RecoveryPoint = {
  id: 'rp-2026-08-11-0415',
  capturedAt: '2026-08-11T04:15:00+02:00',
  configurationAt: '2026-08-11T04:12:00+02:00',
  snapshotAt: '2026-08-11T04:15:00+02:00',
  sourceProvider: 'VMware vCenter Production',
}

export const latestValidationChecks: ValidationCheck[] = [
  { id: 'inventory', label: 'VM configuration inventory', detail: '18 of 18 VM definitions are available.', status: 'passed' },
  { id: 'snapshots', label: 'Storage snapshots', detail: '47 of 48 expected snapshots are available.', status: 'warning' },
  { id: 'mapping', label: 'Application and storage mapping', detail: 'All critical mappings are present.', status: 'passed' },
  { id: 'credentials', label: 'Target credentials', detail: 'Target provider credentials are ready for use.', status: 'passed' },
]

export const latestAutomatedRun: RecoveryTestRun = {
  id: 'test-2026-08-10-001',
  mode: 'automated',
  applicationGroup: 'Production ERP',
  environment: 'Production',
  startedAt: '2026-08-10T22:00:00+02:00',
  duration: '12m 18s',
  status: 'failed',
  checksPassed: 46,
  checksTotal: 48,
  summary: 'One FlashSystem snapshot was not available at validation time.',
}

export const recoveryHistory: RecoveryTestRun[] = [
  latestAutomatedRun,
  { id: 'test-2026-08-03-001', mode: 'automated', applicationGroup: 'Production ERP', environment: 'Production', startedAt: '2026-08-03T22:00:00+02:00', duration: '11m 46s', status: 'passed', checksPassed: 48, checksTotal: 48, summary: 'All recovery readiness checks passed.' },
  { id: 'test-2026-07-31-014', mode: 'manual', applicationGroup: 'Customer Portal', environment: 'Production', startedAt: '2026-07-31T14:30:00+02:00', duration: '8m 04s', status: 'passed', checksPassed: 24, checksTotal: 24, summary: 'Manual point-in-time validation completed successfully.' },
  { id: 'test-2026-07-27-001', mode: 'automated', applicationGroup: 'Finance UAT', environment: 'UAT', startedAt: '2026-07-27T22:00:00+02:00', duration: '6m 51s', status: 'passed', checksPassed: 18, checksTotal: 18, summary: 'All recovery readiness checks passed.' },
]

export const recoveryNotificationRecipients: RecoveryNotificationRecipient[] = [
  { id: 'maria-kovac', name: 'Mária Kováčová', email: 'maria.kovacova@example.com' },
  { id: 'peter-novak', name: 'Peter Novák', email: 'peter.novak@example.com' },
]

export const initialRecoverySchedule: RecoveryScheduleSettings = {
  enabled: true,
  recurrence: 'weekly',
  day: 'Sunday',
  time: '22:00',
  timezone: 'Europe/Bratislava (UTC+02:00)',
  applicationGroupId: 'erp-production',
  recipientId: 'maria-kovac',
}
