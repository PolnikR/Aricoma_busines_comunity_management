/* eslint-disable react-refresh/only-export-components -- These files export React Router route factories, not renderable components. */
import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { routes } from '../routes'

const RecoveryApplicationsListPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage')
  return { default: page.RecoveryApplicationsListPage }
})

const RecoveryApplicationBuilderPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage')
  return { default: page.RecoveryApplicationBuilderPage }
})

const RecoveryGroupsListPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage')
  return { default: page.RecoveryGroupsListPage }
})

const SnapshotPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage')
  return { default: page.SnapshotPoliciesPage }
})

const PolicySetsPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/policy-sets/pages/PolicySetsPage')
  return { default: page.PolicySetsPage }
})

const RecoveryRunsPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage')
  return { default: page.RecoveryRunsPage }
})

const RecoveryGroupBuilderPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage')
  return { default: page.RecoveryGroupBuilderPage }
})

const RecoveryGroupEditorPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage')
  return { default: page.RecoveryGroupEditorPage }
})

const RecoveryApplicationEditorPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage')
  return { default: page.RecoveryApplicationEditorPage }
})

const RecoveryAppPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage')
  return { default: page.RecoveryAppPoliciesPage }
})

const CleanRoomPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage')
  return { default: page.CleanRoomPoliciesPage }
})

export function recoveryPlansRoutes() {
  return (
    <Route path="recovery-plans">
      <Route index element={<Navigate to={routes.recoveryApplications} replace />} />
      <Route path="recovery-groups">
        <Route
          index
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <RecoveryGroupsListPage />
            </Suspense>
          }
        />
        <Route
          path="create"
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton variant="builder" />}>
              <RecoveryGroupBuilderPage />
            </Suspense>
          }
        />
        <Route
          path=":id/edit"
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton variant="builder" />}>
              <RecoveryGroupEditorPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="recovery-applications">
        <Route
          index
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <RecoveryApplicationsListPage />
            </Suspense>
          }
        />
        <Route
          path="create"
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton variant="builder" />}>
              <RecoveryApplicationBuilderPage />
            </Suspense>
          }
        />
        <Route
          path=":id/edit"
          handle={{ contentScroll: 'contained' }}
          element={
            <Suspense fallback={<RouteLoadingSkeleton variant="builder" />}>
              <RecoveryApplicationEditorPage />
            </Suspense>
          }
        />
      </Route>
      <Route
        path="recovery-runs"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <RecoveryRunsPage />
          </Suspense>
        )}
      />
      <Route path="recovery-policies">
        <Route index element={<Navigate to={routes.recoveryPolicySnapshot} replace />} />
        <Route
          path="snapshot"
          handle={{ contentScroll: 'contained' }}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <SnapshotPoliciesPage />
            </Suspense>
          )}
        />
        <Route
          path="application-recovery"
          handle={{ contentScroll: 'contained' }}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <RecoveryAppPoliciesPage />
            </Suspense>
          )}
        />
        <Route
          path="clean-room"
          handle={{ contentScroll: 'contained' }}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <CleanRoomPoliciesPage />
            </Suspense>
          )}
        />
      </Route>
      <Route path="snapshot-policies" element={<Navigate to={routes.recoveryPolicySnapshot} replace />} />
      <Route path="recovery-app-policies" element={<Navigate to={routes.recoveryPolicyApplicationRecovery} replace />} />
      <Route
        path="policy-sets"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <PolicySetsPage />
          </Suspense>
        )}
      />
    </Route>
  )
}
