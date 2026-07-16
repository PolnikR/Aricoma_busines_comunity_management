import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { PlatformAdministrationPage } from '@/features/platform-administration/pages/PlatformAdministrationPage'
import { ProvidersConnectorsPage } from '@/features/providers-connectors/pages/ProvidersConnectorsPage'
import { InfrastructurePage } from '@/features/discovery-inventory/infrastructure/pages/InfrastructurePage'
import { VirtualMachinesPage } from '@/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage'
import { routes } from './routes'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={routes.virtualMachines} replace />} />
        <Route path="platform-administration" element={<PlatformAdministrationPage />} />
        <Route path="providers-connectors" element={<ProvidersConnectorsPage />} />
        <Route path="discovery-inventory/virtual-machines" element={<VirtualMachinesPage />} />
        <Route path="discovery-inventory/infrastructure" element={<InfrastructurePage />} />
        <Route path="*" element={<Navigate to={routes.virtualMachines} replace />} />
      </Route>
    </Routes>
  )
}