import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/app-shell/AppShell'
import { PlatformAdministrationPage } from '@/features/platform-administration/pages/PlatformAdministrationPage'
import { ProvidersConnectorsPage } from '@/features/providers-connectors/pages/ProvidersConnectorsPage'
import { InfrastructurePage } from '@/features/discovery-inventory/infrastructure/pages/InfrastructurePage'
import { VirtualMachinesPage } from '@/features/discovery-inventory/virtual-machines/pages/VirtualMachinesPage'
import { ModulePlaceholderPage } from '@/features/module-placeholder/pages/ModulePlaceholderPage'
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
        <Route path="storage-orchestration" element={<ModulePlaceholderPage title="Storage Orchestration" description="Coordinate approved storage operations across supported storage providers." />} />
        <Route path="vmware-orchestration" element={<ModulePlaceholderPage title="VMware Orchestration" description="Coordinate VMware recovery operations through controlled, auditable workflows." />} />
        <Route path="power-vm-orchestration" element={<ModulePlaceholderPage title="IBM PowerVM Orchestration" description="Coordinate IBM PowerVM recovery operations through HMC-managed infrastructure." />} />
        <Route path="recovery-plans" element={<ModulePlaceholderPage title="Recovery Plans" description="Define, version, approve, and manage reusable recovery plans." />} />
        <Route path="execution-engine" element={<ModulePlaceholderPage title="Execution Engine" description="Run approved recovery plans and track their technical execution state." />} />
        <Route path="monitoring-audit" element={<ModulePlaceholderPage title="Monitoring & Audit" description="Monitor recovery activity and review operational and security evidence." />} />
        <Route path="internal-component-apis" element={<ModulePlaceholderPage title="Internal Component APIs" description="Review the internal service boundaries used by ABCO components." />} />
        <Route path="*" element={<Navigate to={routes.virtualMachines} replace />} />
      </Route>
    </Routes>
  )
}
