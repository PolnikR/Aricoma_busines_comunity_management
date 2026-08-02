import { lazy, Suspense } from 'react'
import {
  Navigate,
  Route,
} from 'react-router'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { ResourcesPage } from '@/features/discovery-inventory/resources/pages/ResourcesPage'
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
        <Route path="platform-administration" element={<Navigate to={routes.platformAdministration} replace />} />
        {renderModulePageRoutes(platformAdministrationPages)}
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
              <ModuleWorkQueuePage
                eyebrow="Recovery Plans"
                title="Recovery Runs"
                description="Execution history and status of recovery runs."
                excelSource="EP-07 Recovery Plans"
                apiBoundary="Pending backend API contract for recovery runs"
                workflowItems={['Run history', 'Active runs', 'Run results']}
              />
            )}
          />
        </Route>
        <Route path="discovery-inventory" element={<Navigate to={routes.resources} replace />} />
        <Route path="discovery-inventory/resources" element={<ResourcesPage />} />
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
        {renderModulePageRoutes(remainingEpicPages.filter((page) => page.path !== routes.recoveryPlans))}
        <Route path="*" element={<Navigate to={routes.resources} replace />} />
    </Route>
  )
}
