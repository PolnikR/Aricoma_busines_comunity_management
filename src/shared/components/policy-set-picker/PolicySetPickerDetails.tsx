import type { ReactNode } from 'react'
import { Button } from '@/shared/components/button/Button'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import type { CatalogSource, PolicyCatalog, PolicyKind, PolicyReference, PolicySetResolution } from '@/features/recovery-plans/recovery-policies/catalog/model/policyCatalog'
import { Badge } from '@/shared/components/badge/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { LayersIcon, RefreshIcon, ShieldIcon } from '@/shared/icons/Icons'
import type { CleanRoomPolicyRecordOutput, PolicySetRecordOutput, RecoveryAppPolicyRecordOutput, SnapshotPolicyRecordOutput } from '@/generated/query/zod'


type Translate = ReturnType<typeof useTranslation>['t']

interface PolicyDetailFact {
  label: string
  value: ReactNode
}

interface PolicyDetailSection {
  key: PolicyKind
  icon: ReactNode
  categoryLabel: string
  name: string
  id: string
  facts: PolicyDetailFact[]
}

interface PolicySetPickerDetailsProps {
  policySet: PolicySetRecordOutput
  references: PolicySetResolution
  sources: PolicyCatalog['sources']
  onRetry: PolicyCatalog['retry']
}

function formatInterval(value: number, unit: string, namespace: 'snapshotPolicies' | 'recoveryAppPolicies', t: Translate) {
  return `${String(value)} ${t(`${namespace}.unit.${unit}`)}`
}

function formatRecoverySelection(policy: RecoveryAppPolicyRecordOutput, t: Translate) {
  if (policy.snapshot_selection_mode === 'latest') return t('recoveryAppPolicies.selection.latest')
  if (policy.snapshot_selection_mode === 'time_range') {
    const age = formatInterval(policy.snapshot_max_age_value ?? 0, policy.snapshot_max_age_unit ?? 'hours', 'recoveryAppPolicies', t)
    return t('recoveryAppPolicies.selection.timeRangeSummary').replace('{age}', age)
  }
  return t('recoveryAppPolicies.selection.exactTimeSummary').replace('{time}', policy.snapshot_target_time ?? '-')
}

function FactField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{label}</dt>
      <dd className="text-xs font-medium text-text-secondary">{value}</dd>
    </div>
  )
}

function buildSections(
  policySet: PolicySetRecordOutput,
  snapshotPolicy: SnapshotPolicyRecordOutput | undefined,
  recoveryPolicy: RecoveryAppPolicyRecordOutput | undefined,
  cleanRoomPolicy: CleanRoomPolicyRecordOutput | undefined,
  t: Translate,
): PolicyDetailSection[] {

  const snapshotFacts: PolicyDetailFact[] = snapshotPolicy ? [
    { label: t('details.frequency'), value: t('snapshotPolicies.every').replace('{interval}', formatInterval(snapshotPolicy.frequency_value, snapshotPolicy.frequency_unit, 'snapshotPolicies', t)) },
    { label: t('details.retention'), value: formatInterval(snapshotPolicy.retention_value, snapshotPolicy.retention_unit, 'snapshotPolicies', t) },
    { label: t('snapshotPolicies.form.flashcopyCopyRate'), value: snapshotPolicy.flashcopy_copy_rate },
    { label: t('details.status'), value: t(snapshotPolicy.enabled ? 'snapshotPolicies.enabled' : 'snapshotPolicies.disabled') },
  ] : []

  const recoveryFacts: PolicyDetailFact[] = recoveryPolicy ? [
    { label: t('details.frequency'), value: t('recoveryAppPolicies.every').replace('{interval}', formatInterval(recoveryPolicy.frequency_value, recoveryPolicy.frequency_unit, 'recoveryAppPolicies', t)) },
    { label: t('details.snapshotSelection'), value: formatRecoverySelection(recoveryPolicy, t) },
    { label: t('details.retention'), value: <span className="inline-flex flex-wrap items-center gap-2">{formatInterval(recoveryPolicy.retention_value, recoveryPolicy.retention_unit, 'recoveryAppPolicies', t)}<span className="rounded bg-surface-muted px-1.5 text-[10px] leading-4 text-text-secondary">{t('recoveryAppPolicies.reservedForFutureUse')}</span></span> },
    { label: t('details.bootVerify'), value: <span className="inline-flex flex-wrap items-center gap-2">{t(recoveryPolicy.boot_verify ? 'recoveryAppPolicies.yes' : 'recoveryAppPolicies.no')}<span className="rounded bg-surface-muted px-1.5 text-[10px] leading-4 text-text-secondary">{t('recoveryAppPolicies.reservedForFutureUse')}</span></span> },
    { label: t('details.status'), value: t(recoveryPolicy.enabled ? 'recoveryAppPolicies.enabled' : 'recoveryAppPolicies.disabled') },
  ] : []

  const cleanRoomFacts: PolicyDetailFact[] = cleanRoomPolicy ? [
    { label: t('details.description'), value: (cleanRoomPolicy.description ?? '') || '-' },
    { label: t('details.status'), value: t(cleanRoomPolicy.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled') },
  ] : []

  return [
    {
      key: 'snapshot',
      icon: <LayersIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.snapshotPolicy'),
      name: snapshotPolicy?.name ?? policySet.snapshot_policy_id ?? '',
      id: policySet.snapshot_policy_id ?? '',
      facts: snapshotFacts,
    },
    {
      key: 'recoveryApp',
      icon: <RefreshIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.recoveryAppPolicy'),
      name: recoveryPolicy?.name ?? policySet.recovery_app_policy_id ?? '',
      id: policySet.recovery_app_policy_id ?? '',
      facts: recoveryFacts,
    },
    {
      key: 'cleanRoom',
      icon: <ShieldIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.cleanRoomPolicy'),
      name: cleanRoomPolicy?.name ?? policySet.clean_room_policy_id ?? '',
      id: policySet.clean_room_policy_id ?? '',
      facts: cleanRoomFacts,
    },
  ]
}

function PolicyDetailCard({ section, reference, source, onRetry }: {
  section: PolicyDetailSection
  reference: PolicyReference<{ id: string }>
  source: CatalogSource<unknown>
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const errorDetail = extractBackendErrorDetail(source.error)
  return (
    <section aria-label={section.categoryLabel} className="min-w-0 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-text-subtle">{section.icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">{section.categoryLabel}</p>
      </div>
      <h4 className="mt-1 truncate text-sm font-semibold text-text-primary" title={section.name}>{section.name || t('detailView.notSet')}</h4>
      <p className="mt-0.5 truncate font-mono text-[10px] text-text-subtle" title={section.id}>{section.id}</p>
      {reference.status === 'missing' || reference.status === 'unknown' ? <p className="mt-3 text-xs text-warning-700 dark:text-warning-400">{t(reference.status === 'missing' ? 'policyCatalog.missing' : 'policyCatalog.unknown', { id: reference.id })}</p> : null}
      {source.status === 'loading' || source.isPaused ? <p className="mt-3 text-xs text-text-muted" role="status">{t(source.isPaused ? 'policyCatalog.paused' : 'policyCatalog.waiting')}</p> : null}
      {source.isRefreshing ? <p className="mt-3 text-xs text-text-muted" role="status">{t('policyCatalog.refreshing')}</p> : null}
      {source.status === 'error' || source.status === 'cachedError' ? (
        <div className="mt-3 space-y-2 text-xs text-warning-700 dark:text-warning-400" role="alert">
          <p>{t(source.status === 'cachedError' ? 'policyCatalog.cachedError' : 'policyCatalog.error', { kind: section.categoryLabel })}</p>
          {errorDetail ? <p>{errorDetail}</p> : null}
          <Button size="xs" variant="outline" onClick={onRetry} disabled={source.isFetching || source.isPaused}>{t('policyCatalog.retry', { kind: section.categoryLabel })}</Button>
        </div>
      ) : null}
      {reference.status === 'resolved' ? (
        <dl className="policy-detail-facts mt-3 grid gap-4">
          {section.facts.map(fact => <FactField key={fact.label} label={fact.label} value={fact.value} />)}
        </dl>
      ) : null}
    </section>
  )
}

export function PolicySetPickerDetails({
  policySet,
  references,
  sources,
  onRetry,
}: PolicySetPickerDetailsProps) {
  const { t } = useTranslation()
  const isLoading = references.summary === 'loading'
  const badgeColor = isLoading ? 'light' : references.summary === 'resolved' ? 'success' : 'warning'
  const badgeLabel = t(references.summary === 'loading'
    ? 'policySets.picker.details.loading'
    : references.summary === 'resolved'
      ? 'policySets.picker.details.resolved'
      : references.summary === 'cachedError'
        ? 'policySets.picker.details.cachedError'
        : 'policySets.picker.details.incomplete')
  const sections = buildSections(
    policySet,
    references.snapshot.status === 'resolved' ? references.snapshot.policy : undefined,
    references.recoveryApp.status === 'resolved' ? references.recoveryApp.policy : undefined,
    references.cleanRoom.status === 'resolved' ? references.cleanRoom.policy : undefined,
    t,
  )

  return (
    <section
      aria-label={t('policySets.picker.details.title')}
      aria-live="polite"
      className="mt-5 max-w-6xl rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('policySets.picker.details.title')}</h3>
          <p className="mt-1 text-sm text-text-muted">{policySet.name}</p>
        </div>
        <Badge color={badgeColor} size="sm">{badgeLabel}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4" style={{ containerType: 'inline-size' }}>
        {sections.map((section) => (
          <PolicyDetailCard key={section.key} section={section} reference={references[section.key]} source={sources[section.key]} onRetry={() => { void onRetry(section.key) }} />
        ))}
      </div>
    </section>
  )
}
