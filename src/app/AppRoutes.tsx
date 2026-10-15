import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { remainingEpicPages } from './modulePageConfigs'
import { routes } from './routes'
import { platformAdministrationRoutes } from './routing/platformAdministrationRoutes'
import { providersConnectorsRoutes } from './routing/providersConnectorsRoutes'
import { recoveryPlansRoutes } from './routing/recoveryPlansRoutes'
import { recoveryActionsRoutes } from './routing/recoveryActionsRoutes'
import { discoveryInventoryRoutes } from './routing/discoveryInventoryRoutes'
import { renderModulePageRoutes } from './routing/routeHelpers'

const OverviewPage = lazy(async () => {
  const page = await import('@/features/dashboard/pages/OverviewPage')
  return { default: page.OverviewPage }
})

export function AppRoutes() {
  // React Router inspects Route elements directly; call route factories instead of rendering wrapper components.
  return (
    <Route element={<AppShell />}>
      <Route index handle={{ contentScroll: 'contained', contentFit: 'viewport' }} element={<Suspense fallback={<RouteLoadingSkeleton />}><OverviewPage /></Suspense>} />
      {platformAdministrationRoutes()}
      {providersConnectorsRoutes()}
      {recoveryPlansRoutes()}
      {recoveryActionsRoutes()}
      {discoveryInventoryRoutes()}
      {renderModulePageRoutes(remainingEpicPages.filter((page) => (
        page.path !== routes.recoveryPlans
      )))}
      <Route path="*" element={<Navigate to={routes.resources} replace />} />
    </Route>
  )
}
