import { lazy, Suspense } from 'react'
import {
  Navigate,
  Route,
} from 'react-router-dom'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { VirtualMachinesPage } from '@/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage'
import { ProvidersPage } from '@/features/providers-connectors/pages/ProvidersPage'
import { ModuleWorkQueuePage } from '@/features/module-placeholder/pages/ModuleWorkQueuePage'
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

const RecoveryApplicationEditorPage = lazy(async () => {
  const page = await import('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage')
  return { default: page.RecoveryApplicationEditorPage }
})

const ProviderDetailPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/providers/pages/ProviderDetailPage')
  return { default: page.ProviderDetailPage }
})

function RouteLoadingState() {
  return (
    <div
      className="flex min-h-96 items-center justify-center rounded-xl border border-[#dfeaf5] bg-white text-sm text-[#71819a]"
      role="status"
    >
      Loading module
    </div>
  )
}

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
        <Route index element={<Navigate to={routes.virtualMachines} replace />} />
        <Route path="platform-administration" element={<Navigate to={routes.platformAdministration} replace />} />
        {renderModulePageRoutes(platformAdministrationPages)}
        <Route path="providers-connectors" element={<Navigate to={routes.providersConnectors} replace />} />
        {renderProvidersConnectorsRoutes(providersConnectorsPages)}
        <Route
          path="providers-connectors/providers/:providerId"
          element={(
            <Suspense fallback={<RouteLoadingState />}>
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
                <Suspense fallback={<RouteLoadingState />}>
                  <RecoveryGroupsListPage />
                </Suspense>
              }
            />
            <Route
              path="create"
              element={
                <Suspense fallback={<RouteLoadingState />}>
                  <RecoveryGroupBuilderPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="recovery-applications">
            <Route
              index
              element={
                <Suspense fallback={<RouteLoadingState />}>
                  <RecoveryApplicationsListPage />
                </Suspense>
              }
            />
            <Route
              path="create"
              element={
                <Suspense fallback={<RouteLoadingState />}>
                  <RecoveryApplicationBuilderPage />
                </Suspense>
              }
            />
            <Route
              path=":id/edit"
              element={
                <Suspense fallback={<RouteLoadingState />}>
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
        <Route path="discovery-inventory" element={<Navigate to={routes.virtualMachines} replace />} />
        <Route path="discovery-inventory/virtual-machines" element={<VirtualMachinesPage />} />
        <Route
          path="discovery-inventory/infrastructure"
          element={(
            <Suspense fallback={<RouteLoadingState />}>
              <InfrastructurePage />
            </Suspense>
          )}
        />
        {renderModulePageRoutes(discoveryInventoryPlaceholderPages)}
        {renderModulePageRoutes(remainingEpicPages.filter((page) => page.path !== routes.recoveryPlans))}
        <Route path="*" element={<Navigate to={routes.virtualMachines} replace />} />
    </Route>
  )
}
