/* eslint-disable react-refresh/only-export-components -- These files export React Router route factories, not renderable components. */
import { lazy, Suspense } from 'react'
import { Navigate, Route } from 'react-router'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import { platformAdministrationPages } from '../modulePageConfigs'
import { routes } from '../routes'
import { renderModulePageRoutes, toRoutePath } from './routeHelpers'

const PlatformProvidersPage = lazy(async () => {
  const page = await import('@/features/platform-administration/platform-providers/pages/PlatformProvidersPage')
  return { default: page.PlatformProvidersPage }
})

const ConfigurationPage = lazy(async () => {
  const page = await import('@/features/platform-administration/configuration/pages/ConfigurationPage')
  return { default: page.ConfigurationPage }
})

const IdentityAccessPage = lazy(async () => {
  const page = await import('@/features/platform-administration/identity-access/pages/IdentityAccessPage')
  return { default: page.IdentityAccessPage }
})

const AuditPage = lazy(async () => {
  const page = await import('@/features/platform-administration/audit/pages/AuditPage')
  return { default: page.AuditPage }
})

export function platformAdministrationRoutes() {
  return (
    <>
      <Route path="platform-administration" element={<Navigate to={routes.platformProviders} replace />} />
      {renderModulePageRoutes(platformAdministrationPages.filter(
        page => page.path !== routes.platformProviders
          && page.path !== routes.platformConfiguration
          && page.path !== routes.platformIdentityAccess,
      ))}
      <Route
        path={toRoutePath(routes.platformProviders)}
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <PlatformProvidersPage />
          </Suspense>
        )}
      />
      <Route
        path={toRoutePath(routes.platformConfiguration)}
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <ConfigurationPage />
          </Suspense>
        )}
      />
      <Route
        path={toRoutePath(routes.platformIdentityAccess)}
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <IdentityAccessPage />
          </Suspense>
        )}
      />
      <Route
        path={toRoutePath(routes.platformAuditRetention)}
        handle={{ contentScroll: 'contained' }}
        element={(
          <Suspense fallback={<RouteLoadingSkeleton />}>
            <AuditPage />
          </Suspense>
        )}
      />
    </>
  )
}
