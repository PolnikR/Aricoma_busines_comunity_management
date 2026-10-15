/* eslint-disable react-refresh/only-export-components -- These files export React Router route factories, not renderable components. */
import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { ResourcesPage } from '@/features/discovery-inventory/resources/pages/ResourcesPage'
import { ResourcesIsePage } from '@/features/discovery-inventory/resources-ise/pages/ResourcesIsePage'
import { InfrastructureTopologySkeleton } from '@/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { discoveryInventoryPlaceholderPages } from '../modulePageConfigs'
import { routes } from '../routes'
import { renderModulePageRoutes, toRoutePath } from './routeHelpers'

const InfrastructurePage = lazy(async () => {
  const page = await import('@/features/discovery-inventory/infrastructure/pages/InfrastructurePage')
  return { default: page.InfrastructurePage }
})

const DiscoverySettingsPage = lazy(async () => {
  const page = await import('@/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage')
  return { default: page.DiscoverySettingsPage }
})

export function discoveryInventoryRoutes() {
  return (
    <>
      <Route path="discovery-inventory" element={<Navigate to={routes.resources} replace />} />
      <Route path={toRoutePath(routes.resources)} handle={{ contentScroll: 'contained' }} element={<ResourcesPage />} />
      <Route path={toRoutePath(routes.resourcesIse)} handle={{ contentScroll: 'contained' }} element={<ResourcesIsePage />} />
      <Route path={toRoutePath(routes.resourcesRoleSourceLegacy)} element={<Navigate to={routes.resources} replace />} />
      <Route path={toRoutePath(routes.resourcesRoleTargetLegacy)} element={<Navigate to={routes.resourcesIse} replace />} />
      <Route path="discovery-inventory/virtual-machines" element={<Navigate to={routes.resources} replace />} />
      <Route
        path="discovery-inventory/infrastructure"
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<InfrastructureTopologySkeleton />}>
            <InfrastructurePage />
          </Suspense>
        )}
      />
      <Route
        path={toRoutePath(routes.discoverySettings)}
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <DiscoverySettingsPage />
          </Suspense>
        )}
      />
      {renderModulePageRoutes(discoveryInventoryPlaceholderPages)}
    </>
  )
}
