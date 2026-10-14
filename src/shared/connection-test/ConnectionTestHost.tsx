import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '@/features/providers-connectors/providers/helpers/providerTypeLabel'
import { ConnectionTestResultDialog } from '@/shared/components/modal/ConnectionTestResultDialog'
import { ConnectionTestNotification } from '@/shared/components/notification/ConnectionTestNotification'
import { useConnectionTestManager, useConnectionTestSnapshot } from './ConnectionTestContext'

export function ConnectionTestHost() {
  const manager = useConnectionTestManager()
  const snapshot = useConnectionTestSnapshot()
  const { t } = useTranslation()
  const visibleRun = snapshot.visibleRunId === null ? null : manager.getRun(snapshot.visibleRunId)

  return (
    <>
      {(snapshot.blockedReason || snapshot.notificationRunIds.length > 0) ? (
        <div className="pointer-events-none fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-100 max-w-[calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col gap-3 overflow-y-auto sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-h-[calc(100dvh-3rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] sm:max-w-[calc(100vw-3rem-env(safe-area-inset-left)-env(safe-area-inset-right))]" aria-label={t('providers.connectionTest.notification.kicker')}>
          {snapshot.blockedReason ? (
            <div className="pointer-events-auto shrink-0 rounded-lg border border-warning-200 bg-surface p-4 text-sm text-text-primary shadow-lg" role="alert">
              <p>{t(snapshot.blockedReason === 'capacity' ? 'providers.connectionTest.capacityReached' : 'providers.connectionTest.sessionUnavailable')}</p>
              <button type="button" className="mt-2 text-xs font-semibold text-accent hover:underline" onClick={manager.clearBlockedReason}>{t('buttons.close')}</button>
            </div>
          ) : null}
          {snapshot.notificationRunIds.slice(0, 5).map((runId) => {
            const run = manager.getRun(runId)
            if (!run) return null
            const failed = run.phase === 'error' || manager.getResult(runId)?.ok === false
            return (
              <div key={runId} className="pointer-events-auto shrink-0">
                <ConnectionTestNotification
                  providerName={run.providerName}
                  failed={failed}
                  onViewResult={() => { manager.openResult(runId) }}
                  onDismiss={() => { manager.dismissNotification(runId) }}
                />
              </div>
            )
          })}
        </div>
      ) : null}
      {visibleRun ? (
        <ConnectionTestResultDialog
          open
          providerName={visibleRun.providerName}
          providerId={visibleRun.providerId}
          {...(visibleRun.providerRole ? { providerRole: visibleRun.providerRole, providerTypeLabel } : {})}
          isPending={visibleRun.phase === 'pending'}
          result={manager.getResult(visibleRun.runId)}
          error={manager.getError(visibleRun.runId)}
          onClose={manager.closeResult}
          onRetry={() => {
            manager.startTest(visibleRun.kind, visibleRun.providerId, visibleRun.providerName, visibleRun.providerRole)
          }}
        />
      ) : null}
    </>
  )
}
