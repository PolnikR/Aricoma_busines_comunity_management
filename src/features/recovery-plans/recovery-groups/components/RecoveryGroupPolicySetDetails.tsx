import type { ReactNode } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import type { SnapshotPolicy } from '@/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyTypes'
import type { RecoveryAppPolicy } from '@/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicyTypes'
import type { CleanRoomPolicy } from '@/features/recovery-plans/recovery-policies/clean-room/model/cleanRoomPolicyTypes'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'

type Translate = ReturnType<typeof useTranslation>['t']

interface RecoveryGroupPolicySetDetailsProps {
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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border/70 py-2 first:border-t-0">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-right text-xs font-medium text-text-secondary">{value}</dd>
    </div>
  )
}

function PolicyDetailCard({ title, name, policyId, unavailable, children }: {
  title: string
  name: string
  policyId: string
  unavailable: string | null
  children: ReactNode
}) {
  return (
    <section className="min-w-0 border-t border-border pt-3 first:border-t-0 first:pt-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 lg:first:border-l-0 lg:first:pl-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">{title}</p>
      <h4 className="mt-1 truncate text-sm font-semibold text-text-primary" title={name}>{name}</h4>
      <p className="mt-0.5 truncate font-mono text-[10px] text-text-subtle" title={policyId}>{policyId}</p>
      {unavailable ? <p className="mt-3 text-xs text-warning-700 dark:text-warning-400">{unavailable}</p> : <dl className="mt-3">{children}</dl>}
    </section>
  )
}

export function RecoveryGroupPolicySetDetails({
  policySet,
  snapshotPolicy,
  recoveryPolicy,
  cleanRoomPolicy,
  isLoading,
  hasQueryError,
}: RecoveryGroupPolicySetDetailsProps) {
  const { t } = useTranslation()
  const missingDetails = !snapshotPolicy || !recoveryPolicy || !cleanRoomPolicy
  const detailsUnavailable = hasQueryError || (!isLoading && missingDetails)
  const unavailableText = isLoading
    ? t('pages.recoveryGroupBuilder.policySet.details.loading')
    : t('pages.recoveryGroupBuilder.policySet.details.unavailable')
  const badgeColor = isLoading ? 'light' : detailsUnavailable ? 'warning' : 'success'
  const badgeLabel = isLoading
    ? t('pages.recoveryGroupBuilder.policySet.details.loading')
    : t(detailsUnavailable
      ? 'pages.recoveryGroupBuilder.policySet.details.incomplete'
      : 'pages.recoveryGroupBuilder.policySet.details.resolved')

  return (
    <section
      aria-label={t('pages.recoveryGroupBuilder.policySet.details.title')}
      aria-live="polite"
      className="mt-5 max-w-6xl rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.policySet.details.title')}</h3>
          <p className="mt-1 text-sm text-text-muted">{policySet.name}</p>
        </div>
        <Badge color={badgeColor} size="sm">{badgeLabel}</Badge>
      </div>

      {isLoading ? <p className="mt-3 text-xs text-text-muted" role="status">{unavailableText}</p> : null}
      {detailsUnavailable ? (
        <p className="mt-3 text-xs text-warning-700 dark:text-warning-400" role="alert">
          {t('pages.recoveryGroupBuilder.policySet.details.loadFailed')}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PolicyDetailCard title={t('policySets.form.snapshotPolicy')} name={snapshotPolicy?.name ?? policySet.snapshotPolicyId} policyId={policySet.snapshotPolicyId} unavailable={snapshotPolicy ? null : unavailableText}>
          {snapshotPolicy ? <>
            <DetailRow label={t('details.frequency')} value={t('snapshotPolicies.every').replace('{interval}', formatInterval(snapshotPolicy.frequencyValue, snapshotPolicy.frequencyUnit, 'snapshotPolicies', t))} />
            <DetailRow label={t('details.retention')} value={formatInterval(snapshotPolicy.retentionValue, snapshotPolicy.retentionUnit, 'snapshotPolicies', t)} />
            <DetailRow label={t('details.status')} value={t(snapshotPolicy.enabled ? 'snapshotPolicies.enabled' : 'snapshotPolicies.disabled')} />
          </> : null}
        </PolicyDetailCard>

        <PolicyDetailCard title={t('policySets.form.recoveryAppPolicy')} name={recoveryPolicy?.name ?? policySet.recoveryAppPolicyId} policyId={policySet.recoveryAppPolicyId} unavailable={recoveryPolicy ? null : unavailableText}>
          {recoveryPolicy ? <>
            <DetailRow label={t('details.frequency')} value={t('recoveryAppPolicies.every').replace('{interval}', formatInterval(recoveryPolicy.frequencyValue, recoveryPolicy.frequencyUnit, 'recoveryAppPolicies', t))} />
            <DetailRow label={t('details.snapshotSelection')} value={formatRecoverySelection(recoveryPolicy, t)} />
            <DetailRow label={t('details.retention')} value={formatInterval(recoveryPolicy.retentionValue, recoveryPolicy.retentionUnit, 'recoveryAppPolicies', t)} />
            <DetailRow label={t('details.bootVerify')} value={t(recoveryPolicy.bootVerify ? 'recoveryAppPolicies.yes' : 'recoveryAppPolicies.no')} />
            <DetailRow label={t('details.status')} value={t(recoveryPolicy.enabled ? 'recoveryAppPolicies.enabled' : 'recoveryAppPolicies.disabled')} />
          </> : null}
        </PolicyDetailCard>

        <PolicyDetailCard title={t('policySets.form.cleanRoomPolicy')} name={cleanRoomPolicy?.name ?? policySet.cleanRoomPolicyId} policyId={policySet.cleanRoomPolicyId} unavailable={cleanRoomPolicy ? null : unavailableText}>
          {cleanRoomPolicy ? <>
            <DetailRow label={t('details.description')} value={cleanRoomPolicy.description || '-'} />
            <DetailRow label={t('details.status')} value={t(cleanRoomPolicy.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled')} />
          </> : null}
        </PolicyDetailCard>
      </div>
    </section>
  )
}
