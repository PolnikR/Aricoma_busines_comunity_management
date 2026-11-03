import { Link } from 'react-router'
import type { UseQueryResult } from '@tanstack/react-query'
import { routes } from '@/app/routes'
import { useGetRecoveryGroups } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { useGetRecoveryApps } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { findPolicySetConsumers, type ReferenceConsumer } from '../../references/model/policyReferences'

interface UsageSourceProps {
  source: 'groups' | 'applications'
  query: UseQueryResult<ReferenceConsumer[]>
}

function UsageSource({ source, query }: UsageSourceProps) {
  const { t } = useTranslation()
  const label = t(`policyReferences.sources.${source}`)
  const path = source === 'groups' ? routes.recoveryGroups : routes.recoveryApplications
  return (
    <section aria-label={label} className="space-y-3">
      <h4 className="text-sm font-semibold text-text-primary">{label}</h4>
      {query.isPaused ? <p role="status" className="text-sm text-text-muted">{t('policyReferences.usedIn.paused')}</p>
        : query.isFetching ? <p role="status" className="text-sm text-text-muted">{t(query.data === undefined ? 'policyReferences.usedIn.loading' : 'policyReferences.usedIn.refreshing')}</p> : null}
      {query.isError ? (
        <div className="space-y-2">
          <Alert variant={query.data === undefined ? 'error' : 'warning'}
            title={t(query.data === undefined ? 'policyReferences.usedIn.error' : 'policyReferences.usedIn.cachedError', { source: label })}
            description={resolveUserFacingErrorMessage(query.error, '')} />
          <Button size="sm" variant="outline" disabled={query.isFetching || query.isPaused} onClick={() => { void query.refetch() }}>
            {t('policyReferences.usedIn.retry', { source: label })}
          </Button>
        </div>
      ) : null}
      {query.data && query.data.length > 0 ? (
        <ul className="space-y-2">
          {query.data.map(consumer => (
            <li key={consumer.id} className="rounded-lg border border-border px-3 py-2 wrap-anywhere">
              <Link className="text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                to={{ pathname: path, search: new URLSearchParams({ detail: consumer.id }).toString() }}
                aria-label={t('policyReferences.openDetail', { name: consumer.name })}>
                {consumer.name}
              </Link>
              <p className="font-mono text-xs text-text-muted">{consumer.id}</p>
            </li>
          ))}
        </ul>
      ) : query.isSuccess && !query.isFetching && !query.isPaused ? (
        <p className="text-sm text-text-muted">{t('policyReferences.usedIn.sourceEmpty', { source: label })}</p>
      ) : null}
    </section>
  )
}

export function PolicySetUsage({ policySetId }: { policySetId: string }) {
  const { t } = useTranslation()
  const groups = useGetRecoveryGroups({ query: {
    select: response => findPolicySetConsumers(policySetId, response.recovery_groups, []).groups,
  } })
  const applications = useGetRecoveryApps({ query: {
    select: response => findPolicySetConsumers(policySetId, [], response.applications).applications,
  } })
  const isUnused = groups.isSuccess && applications.isSuccess && !groups.isFetching && !applications.isFetching
    && !groups.isPaused && !applications.isPaused && groups.data.length === 0 && applications.data.length === 0
  return (
    <div className="space-y-6">
      {isUnused ? <p role="status" className="text-sm text-text-muted">{t('policyReferences.usedIn.empty')}</p> : null}
      <UsageSource source="groups" query={groups} />
      <UsageSource source="applications" query={applications} />
    </div>
  )
}
