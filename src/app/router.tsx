import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
  const page = await import('@/features/providers-connectors/recovery-applications/pages/RecoveryApplicationsListPage')
  return { default: page.RecoveryApplicationsListPage }
})

const RecoveryApplicationBuilderPage = lazy(async () => {
  const page = await import('@/features/providers-connectors/recovery-applications/pages/RecoveryApplicationBuilderPage')
  return { default: page.RecoveryApplicationBuilderPage }
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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={routes.virtualMachines} replace />} />
        <Route path="platform-administration" element={<Navigate to={routes.platformAdministration} replace />} />
        {renderModulePageRoutes(platformAdministrationPages)}
        <Route path="providers-connectors" element={<Navigate to={routes.providersConnectors} replace />} />
        {renderProvidersConnectorsRoutes(providersConnectorsPages)}
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
        {renderModulePageRoutes(remainingEpicPages)}
        <Route path="*" element={<Navigate to={routes.virtualMachines} replace />} />
      </Route>
    </Routes>
  )
}
