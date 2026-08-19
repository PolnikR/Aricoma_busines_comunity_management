import { lazy, Suspense } from 'react'
import {
  Navigate,
  Route,
} from 'react-router'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { ResourcesPage } from '@/features/discovery-inventory/resources/pages/ResourcesPage'
import { ResourcesIsePage } from '@/features/discovery-inventory/resources/pages/ResourcesIsePage'
import { ProvidersPage } from '@/features/providers-connectors/providers/pages/ProvidersPage'
import { ModuleWorkQueuePage } from '@/features/module-placeholder/pages/ModuleWorkQueuePage'
import { InfrastructureTopologySkeleton } from '@/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton'
import { RouteLoadingSkeleton } from '@/shared/components/page/RouteLoadingSkeleton'
import {
  discoveryInventoryPlaceholderPages,
  platformAdministrationPages,
  providersConnectorsPages,
  remainingEpicPages,
} from './modulePageConfigs'
import { routes } from './routes'

const InfrastructurePage = lazy(async () => {
  const page = await import('@/features/discovery-inventory/infrastructure/pages/InfrastructurePage')
  return { default: page.InfrastructurePage }
})

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

const ProviderDetailPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/providers/pages/ProviderDetailPage')
  return { default: page.ProviderDetailPage }
})

const CredentialsPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/credentials/pages/CredentialsPage')
  return { default: page.CredentialsPage }
})

const RecoveryAppPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage')
  return { default: page.RecoveryAppPoliciesPage }
})

const CleanRoomPoliciesPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage')
  return { default: page.CleanRoomPoliciesPage }
})

const DiscoverySettingsPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage')
  return { default: page.DiscoverySettingsPage }
})

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

const PlatformProvidersPage = lazy(async () => {
  const page = await import('@/features/platform-administration/platform-providers/pages/PlatformProvidersPage')
  return { default: page.PlatformProvidersPage }
})

const ConfigurationPage = lazy(async () => {
  const page = await import('@/features/platform-administration/configuration/pages/ConfigurationPage')
  return { default: page.ConfigurationPage }
})

const IdentityAccessPage = lazy(async () => {
  const page = await import('@/features/identity-access/pages/IdentityAccessPage')
  return { default: page.IdentityAccessPage }
})

function toRoutePath(path: string) {
  return path.replace(/^\//, '')
}

function renderModulePageRoutes(pages: typeof platformAdministrationPages) {
  return pages.map((page) => (
    <Route
      key={page.path}
      path={toRoutePath(page.path)}
      element={<ModuleWorkQueuePage {...page} />}
    />
  ))
}

function renderProvidersConnectorsRoutes(pages: typeof providersConnectorsPages) {
  return pages.map((page) => {
    if (page.path === routes.providersConnectors) {
      return (
        <Route
          key={page.path}
          path={toRoutePath(page.path)}
          element={<ProvidersPage />}
        />
      )
    }
    if (page.path === routes.providerCredentials) {
      return (
        <Route
          key={page.path}
          path={toRoutePath(page.path)}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <CredentialsPage />
            </Suspense>
          )}
        />
      )
    }
    if (page.path === routes.providerDiscoverySettings) {
      return (
        <Route
          key={page.path}
          path={toRoutePath(page.path)}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <DiscoverySettingsPage />
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

export function AppRoutes() {
  return (
    <Route element={<AppShell />}>
        <Route index element={<Navigate to={routes.resources} replace />} />
        <Route path="platform-administration" element={<Navigate to={routes.platformProviders} replace />} />
        {renderModulePageRoutes(platformAdministrationPages.filter(
          page => page.path !== routes.platformProviders
            && page.path !== routes.platformConfiguration
            && page.path !== routes.platformIdentityAccess,
        ))}
        <Route
          path={toRoutePath(routes.platformProviders)}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <PlatformProvidersPage />
            </Suspense>
          )}
        />
        <Route
          path={toRoutePath(routes.platformConfiguration)}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <ConfigurationPage />
            </Suspense>
          )}
        />
        <Route
          path={toRoutePath(routes.platformIdentityAccess)}
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <IdentityAccessPage />
            </Suspense>
          )}
        />
        <Route path="providers-connectors" element={<Navigate to={routes.providersConnectors} replace />} />
        {renderProvidersConnectorsRoutes(providersConnectorsPages)}
        <Route
          path="providers-connectors/providers/:providerId"
          element={(
            <Suspense fallback={<RouteLoadingSkeleton />}>
              <ProviderDetailPage />
            </Suspense>
          )}
        />
        <Route path="recovery-plans">
          <Route index element={<Navigate to={routes.recoveryApplications} replace />} />
          <Route path="recovery-groups">
            <Route
              index
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryGroupsListPage />
                </Suspense>
              }
            />
            <Route
              path="create"
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryGroupBuilderPage />
                </Suspense>
              }
            />
            <Route
              path=":id/edit"
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryGroupEditorPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="recovery-applications">
            <Route
              index
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryApplicationsListPage />
                </Suspense>
              }
            />
            <Route
              path="create"
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryApplicationBuilderPage />
                </Suspense>
              }
            />
            <Route
              path=":id/edit"
              element={
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryApplicationEditorPage />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="recovery-runs"
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
              element={(
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <SnapshotPoliciesPage />
                </Suspense>
              )}
            />
            <Route
              path="application-recovery"
              element={(
                <Suspense fallback={<RouteLoadingSkeleton />}>
                  <RecoveryAppPoliciesPage />
                </Suspense>
              )}
            />
            <Route
              path="clean-room"
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
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <PolicySetsPage />
              </Suspense>
            )}
          />
        </Route>
        <Route path="recovery-actions">
          <Route index element={<Navigate to={routes.recoveryActionValidate} replace />} />
          <Route
            path="validate"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <RecoveryActionsValidatePage />
              </Suspense>
            )}
          />
          <Route
            path="execute"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <RecoveryActionsExecutePage />
              </Suspense>
            )}
          />
          <Route
            path="schedule"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <RecoveryActionsSchedulePage />
              </Suspense>
            )}
          />
          <Route
            path="history"
            element={(
              <Suspense fallback={<RouteLoadingSkeleton />}>
                <RecoveryActionsHistoryPage />
              </Suspense>
            )}
          />
          <Route path="*" element={<Navigate to={routes.recoveryActionValidate} replace />} />
        </Route>
        <Route path="discovery-inventory" element={<Navigate to={routes.resources} replace />} />
        <Route path="discovery-inventory/resources" element={<ResourcesPage />} />
        <Route path="discovery-inventory/resources-ise" element={<ResourcesIsePage />} />
        <Route path="discovery-inventory/virtual-machines" element={<Navigate to={routes.resources} replace />} />
        <Route
          path="discovery-inventory/infrastructure"
          element={(
            <Suspense fallback={<InfrastructureTopologySkeleton />}>
              <InfrastructurePage />
            </Suspense>
          )}
        />
        {renderModulePageRoutes(discoveryInventoryPlaceholderPages)}
        {renderModulePageRoutes(remainingEpicPages.filter((page) => (
          page.path !== routes.recoveryPlans
        )))}
        <Route path="*" element={<Navigate to={routes.resources} replace />} />
    </Route>
  )
}
