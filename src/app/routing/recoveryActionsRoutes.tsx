/* eslint-disable react-refresh/only-export-components -- These files export React Router route factories, not renderable components. */
import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { routes } from '../routes'

const RecoveryActionsValidatePage = lazy(async () => {
  const page = await import('@/features/recovery-actions/pages/RecoveryActionsValidatePage')
  return { default: page.RecoveryActionsValidatePage }
})

const RecoveryActionsExecutePage = lazy(async () => {
  const page = await import('@/features/recovery-actions/pages/RecoveryActionsExecutePage')
  return { default: page.RecoveryActionsExecutePage }
})

const RecoveryActionsSchedulePage = lazy(async () => {
  const page = await import('@/features/recovery-actions/pages/RecoveryActionsSchedulePage')
  return { default: page.RecoveryActionsSchedulePage }
})

const RecoveryActionsHistoryPage = lazy(async () => {
  const page = await import('@/features/recovery-actions/pages/RecoveryActionsHistoryPage')
  return { default: page.RecoveryActionsHistoryPage }
})

export function recoveryActionsRoutes() {
  return (
    <Route path="recovery-actions">
      <Route index element={<Navigate to={routes.recoveryActionValidate} replace />} />
      <Route
        path="validate"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <RecoveryActionsValidatePage />
          </Suspense>
        )}
      />
      <Route
        path="execute"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <RecoveryActionsExecutePage />
          </Suspense>
        )}
      />
      <Route
        path="schedule"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <RecoveryActionsSchedulePage />
          </Suspense>
        )}
      />
      <Route
        path="history"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <RecoveryActionsHistoryPage />
          </Suspense>
        )}
      />
      <Route path="*" element={<Navigate to={routes.recoveryActionValidate} replace />} />
    </Route>
  )
}
