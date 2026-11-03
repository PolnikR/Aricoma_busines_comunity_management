import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import type { ReferenceDeleteIssue } from '../hooks/useReferenceProtectedDelete'

interface ReferenceDeleteNoticeProps {
  issue: ReferenceDeleteIssue | null
  onClose: () => void
}

export function ReferenceDeleteNotice({ issue, onClose }: ReferenceDeleteNoticeProps) {
  const { t } = useTranslation()
  if (!issue) return null
  const title = t(issue.type === 'inUse' ? 'policyReferences.blocked.title' : 'policyReferences.checkFailed.title')

  return (
    <Modal open onClose={onClose} title={title} size="lg" className="max-w-[calc(100vw-2rem)] sm:max-w-2xl"
      footer={<Button size="sm" onClick={onClose}>{t('buttons.close')}</Button>}>
      <div className="space-y-5 px-6 py-5">
        <Alert title={title} variant={issue.type === 'inUse' ? 'warning' : 'error'}
          description={t(issue.type === 'inUse' ? 'policyReferences.blocked.description' : 'policyReferences.checkFailed.description')} />
        {issue.type === 'inUse' ? (['policySets', 'groups', 'applications'] as const).map(source => (
          issue.consumers[source].length > 0 ? (
            <section key={source}>
              <h3 className="mb-2 text-sm font-semibold text-text-primary">{t(`policyReferences.sources.${source}`)}</h3>
              <ul className="space-y-2">
                {issue.consumers[source].map(consumer => (
                  <li key={consumer.id} className="rounded-lg border border-border px-3 py-2 wrap-anywhere">
                    <p className="text-sm text-text-primary">{consumer.name}</p>
                    <p className="font-mono text-xs text-text-muted">{consumer.id}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        )) : (
          <ul className="space-y-3">
            {issue.failures.map(failure => (
              <li key={failure.source} className="wrap-anywhere">
                <p className="text-sm font-semibold text-text-primary">{t(`policyReferences.sources.${failure.source}`)}</p>
                <p className="text-sm text-text-muted">{resolveUserFacingErrorMessage(failure.error, t('policyReferences.checkFailed.description'))}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
