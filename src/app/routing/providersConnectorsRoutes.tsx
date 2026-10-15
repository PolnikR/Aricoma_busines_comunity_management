/* eslint-disable react-refresh/only-export-components -- These files export React Router route factories, not renderable components. */
import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { ProvidersPage } from '@/features/providers-connectors/providers/pages/ProvidersPage'
import { ModuleWorkQueuePage } from '@/features/module-placeholder/pages/ModuleWorkQueuePage'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { providersConnectorsPages } from '../modulePageConfigs'
import { routes } from '../routes'
import { RedirectPreservingSearch } from './RedirectPreservingSearch'
import { toRoutePath } from './routeHelpers'

const ProviderDetailPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/providers/pages/ProviderDetailPage')
  return { default: page.ProviderDetailPage }
})

const CredentialsPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/credentials/pages/CredentialsPage')
  return { default: page.CredentialsPage }
})

function renderProvidersConnectorsRoutes(pages: typeof providersConnectorsPages) {
  return pages.map((page) => {
    if (page.path === routes.providersConnectors) {
      return (
        <Route
          key={page.path}
          path={toRoutePath(page.path)}
          handle={{ contentScroll: 'contained' }}
          element={<ProvidersPage />}
        />
      )
    }
    if (page.path === routes.providerCredentials) {
      return (
        <Route
          key={page.path}
          path={toRoutePath(page.path)}
          handle={{ contentScroll: 'contained' }}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <CredentialsPage />
            </Suspense>
          )}
        />
      )
    }
    return (
      <Route
        key={page.path}
        path={toRoutePath(page.path)}
        element={<ModuleWorkQueuePage {...page} />}
      />
    )
  })
}

export function providersConnectorsRoutes() {
  return (
    <>
      <Route path="providers-connectors" element={<Navigate to={routes.providersConnectors} replace />} />
      <Route path={toRoutePath(routes.discoverySettingsLegacy)} element={<RedirectPreservingSearch to={routes.discoverySettings} />} />
      {renderProvidersConnectorsRoutes(providersConnectorsPages)}
      <Route
        path="providers-connectors/providers/:providerId"
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <ProviderDetailPage />
          </Suspense>
        )}
      />
    </>
  )
}
