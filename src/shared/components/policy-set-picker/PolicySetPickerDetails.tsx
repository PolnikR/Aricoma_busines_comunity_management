import type { ReactNode } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import { LayersIcon, RefreshIcon, ShieldIcon } from '@/shared/icons/Icons'
import type { SnapshotPolicy } from '@/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyTypes'
import type { RecoveryAppPolicy } from '@/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicyTypes'
import type { CleanRoomPolicy } from '@/features/recovery-plans/recovery-policies/clean-room/model/cleanRoomPolicyTypes'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'

type Translate = ReturnType<typeof useTranslation>['t']

interface PolicyDetailFact {
  label: string
  value: ReactNode
}

interface PolicyDetailSection {
  key: string
  icon: ReactNode
  categoryLabel: string
  name: string
  id: string
  facts: PolicyDetailFact[]
  isUnavailable: boolean
}

interface PolicySetPickerDetailsProps {
  policySet: PolicySet
  snapshotPolicy: SnapshotPolicy | undefined
  recoveryPolicy: RecoveryAppPolicy | undefined
  cleanRoomPolicy: CleanRoomPolicy | undefined
  isLoading: boolean
  hasQueryError: boolean
}

function formatInterval(value: number, unit: string, namespace: 'snapshotPolicies' | 'recoveryAppPolicies', t: Translate) {
  return `${String(value)} ${t(`${namespace}.unit.${unit}`)}`
}

function formatRecoverySelection(policy: RecoveryAppPolicy, t: Translate) {
  if (policy.snapshotSelectionMode === 'latest') return t('recoveryAppPolicies.selection.latest')
  if (policy.snapshotSelectionMode === 'time_range') {
    const age = formatInterval(policy.snapshotMaxAgeValue ?? 0, policy.snapshotMaxAgeUnit ?? 'hours', 'recoveryAppPolicies', t)
    return t('recoveryAppPolicies.selection.timeRangeSummary').replace('{age}', age)
  }
  return t('recoveryAppPolicies.selection.exactTimeSummary').replace('{time}', policy.snapshotTargetTime ?? '-')
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
  policySet: PolicySet,
  snapshotPolicy: SnapshotPolicy | undefined,
  recoveryPolicy: RecoveryAppPolicy | undefined,
  cleanRoomPolicy: CleanRoomPolicy | undefined,
  t: Translate,
): PolicyDetailSection[] {

  const snapshotFacts: PolicyDetailFact[] = snapshotPolicy ? [
    { label: t('details.frequency'), value: t('snapshotPolicies.every').replace('{interval}', formatInterval(snapshotPolicy.frequencyValue, snapshotPolicy.frequencyUnit, 'snapshotPolicies', t)) },
    { label: t('details.retention'), value: formatInterval(snapshotPolicy.retentionValue, snapshotPolicy.retentionUnit, 'snapshotPolicies', t) },
    { label: t('details.status'), value: t(snapshotPolicy.enabled ? 'snapshotPolicies.enabled' : 'snapshotPolicies.disabled') },
  ] : []

  const recoveryFacts: PolicyDetailFact[] = recoveryPolicy ? [
    { label: t('details.frequency'), value: t('recoveryAppPolicies.every').replace('{interval}', formatInterval(recoveryPolicy.frequencyValue, recoveryPolicy.frequencyUnit, 'recoveryAppPolicies', t)) },
    { label: t('details.snapshotSelection'), value: formatRecoverySelection(recoveryPolicy, t) },
    { label: t('details.retention'), value: formatInterval(recoveryPolicy.retentionValue, recoveryPolicy.retentionUnit, 'recoveryAppPolicies', t) },
    { label: t('details.bootVerify'), value: t(recoveryPolicy.bootVerify ? 'recoveryAppPolicies.yes' : 'recoveryAppPolicies.no') },
    { label: t('details.status'), value: t(recoveryPolicy.enabled ? 'recoveryAppPolicies.enabled' : 'recoveryAppPolicies.disabled') },
  ] : []

  const cleanRoomFacts: PolicyDetailFact[] = cleanRoomPolicy ? [
    { label: t('details.description'), value: cleanRoomPolicy.description || '-' },
    { label: t('details.status'), value: t(cleanRoomPolicy.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled') },
  ] : []

  return [
    {
      key: 'snapshot',
      icon: <LayersIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.snapshotPolicy'),
      name: snapshotPolicy?.name ?? policySet.snapshotPolicyId,
      id: policySet.snapshotPolicyId,
      facts: snapshotFacts,
      isUnavailable: !snapshotPolicy,
    },
    {
      key: 'recovery',
      icon: <RefreshIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.recoveryAppPolicy'),
      name: recoveryPolicy?.name ?? policySet.recoveryAppPolicyId,
      id: policySet.recoveryAppPolicyId,
      facts: recoveryFacts,
      isUnavailable: !recoveryPolicy,
    },
    {
      key: 'cleanroom',
      icon: <ShieldIcon className="h-5 w-5" />,
      categoryLabel: t('policySets.form.cleanRoomPolicy'),
      name: cleanRoomPolicy?.name ?? policySet.cleanRoomPolicyId,
      id: policySet.cleanRoomPolicyId,
      facts: cleanRoomFacts,
      isUnavailable: !cleanRoomPolicy,
    },
  ]
}

function PolicyDetailCard({ section, unavailableText }: {
  section: PolicyDetailSection
  unavailableText: string
}) {
  return (
    <section className="min-w-0 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-text-subtle">{section.icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">{section.categoryLabel}</p>
      </div>
      <h4 className="mt-1 truncate text-sm font-semibold text-text-primary" title={section.name}>{section.name}</h4>
      <p className="mt-0.5 truncate font-mono text-[10px] text-text-subtle" title={section.id}>{section.id}</p>
      {section.isUnavailable ? (
        <p className="mt-3 text-xs text-warning-700 dark:text-warning-400">{unavailableText}</p>
      ) : (
        <dl className="policy-detail-facts mt-3 grid gap-4">
          {section.facts.map((fact) => (
            <FactField key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </dl>
      )}
    </section>
  )
}

export function PolicySetPickerDetails({
  policySet,
  snapshotPolicy,
  recoveryPolicy,
  cleanRoomPolicy,
  isLoading,
  hasQueryError,
}: PolicySetPickerDetailsProps) {
  const { t } = useTranslation()
  const missingDetails = !snapshotPolicy || !recoveryPolicy || !cleanRoomPolicy
  const detailsUnavailable = hasQueryError || (!isLoading && missingDetails)
  const unavailableText = isLoading
    ? t('policySets.picker.details.loading')
    : t('policySets.picker.details.unavailable')
  const badgeColor = isLoading ? 'light' : detailsUnavailable ? 'warning' : 'success'
  const badgeLabel = isLoading
    ? t('policySets.picker.details.loading')
    : t(detailsUnavailable
      ? 'policySets.picker.details.incomplete'
      : 'policySets.picker.details.resolved')

  const sections = buildSections(policySet, snapshotPolicy, recoveryPolicy, cleanRoomPolicy, t)

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

      {isLoading ? <p className="mt-3 text-xs text-text-muted" role="status">{unavailableText}</p> : null}
      {detailsUnavailable ? (
        <p className="mt-3 text-xs text-warning-700 dark:text-warning-400" role="alert">
          {t('policySets.picker.details.loadFailed')}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4" style={{ containerType: 'inline-size' }}>
        {sections.map((section) => (
          <PolicyDetailCard key={section.key} section={section} unavailableText={unavailableText} />
        ))}
      </div>
    </section>
  )
}
