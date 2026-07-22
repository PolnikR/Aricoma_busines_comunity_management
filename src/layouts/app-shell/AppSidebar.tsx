import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { routes } from '@/app/routes'
import {
  ApiIcon,
  ChevronDownIcon,
  ExecutionIcon,
  GridIcon,
  LayersIcon,
  MonitoringIcon,
  PlugIcon,
  ServerIcon,
  SettingsIcon,
} from '@/shared/icons/Icons'
import { useSidebar } from './useSidebar'

interface NavItem {
  name: string
  icon: ReactNode
  path?: string
  subItems?: {
    name: string
    path: string
  }[]
}

const navItems: NavItem[] = [
  {
    name: 'Platform Administration',
    icon: <SettingsIcon />,
    subItems: [
      { name: 'Overview', path: routes.platformAdministration },
      { name: 'Configuration', path: routes.platformConfiguration },
      { name: 'Identity & Access', path: routes.platformIdentityAccess },
      { name: 'Secrets', path: routes.platformSecrets },
      { name: 'Certificates', path: routes.platformCertificates },
      { name: 'Diagnostics', path: routes.platformDiagnostics },
      { name: 'Audit & Retention', path: routes.platformAuditRetention },
    ],
  },
  {
    name: 'Providers & Connectors',
    icon: <PlugIcon />,
    subItems: [
      { name: 'Providers', path: routes.providersConnectors },
      { name: 'Connection Profiles', path: routes.providerConnectionProfiles },
      { name: 'Credentials', path: routes.providerCredentials },
      { name: 'Capability Matrix', path: routes.providerCapabilityMatrix },
      { name: 'Discovery Settings', path: routes.providerDiscoverySettings },
      { name: 'Health & Diagnostics', path: routes.providerHealthDiagnostics },
    ],
  },
  {
    name: 'Discovery & Inventory',
    icon: <ServerIcon />,
    subItems: [
      { name: 'Virtual Machines', path: routes.virtualMachines },
      { name: 'Infrastructure Topology', path: routes.infrastructure },
      { name: 'Discovery Jobs', path: routes.discoveryJobs },
      { name: 'Inventory Search', path: routes.inventorySearch },
      { name: 'File Import', path: routes.fileImport },
      { name: 'Validation & Commit', path: routes.validationCommit },
      { name: 'Snapshots & History', path: routes.snapshotsHistory },
      { name: 'Discovery Agents', path: routes.discoveryAgents },
    ],
  },
  {
    name: 'Storage Orchestration',
    icon: <LayersIcon />,
    path: routes.storageOrchestration,
  },
  {
    name: 'VMware Orchestration',
    icon: <GridIcon />,
    path: routes.vmwareOrchestration,
  },
  {
    name: 'IBM PowerVM Orchestration',
    icon: <ServerIcon />,
    path: routes.powerVmOrchestration,
  },
  {
    name: 'Recovery Plans',
    icon: <LayersIcon />,
    subItems: [
      { name: 'Recovery Applications', path: routes.recoveryApplications },
      { name: 'Recovery Runs', path: routes.recoveryRuns },
    ],
  },
  {
    name: 'Execution Engine',
    icon: <ExecutionIcon />,
    path: routes.executionEngine,
  },
  {
    name: 'Monitoring & Audit',
    icon: <MonitoringIcon />,
    path: routes.monitoringAudit,
  },
  {
    name: 'Internal Component APIs',
    icon: <ApiIcon />,
    path: routes.internalComponentApis,
  },
]

function findRouteMenu(pathname: string): string | undefined {
  const activeItem = navItems.find((item) => item.subItems?.some((subItem) => pathname === subItem.path || pathname.startsWith(`${subItem.path}/`)))
  return activeItem?.name
}

export function AppSidebar() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string>(() => findRouteMenu(location.pathname) ?? 'Discovery & Inventory')

  // The menu that owns the current route is always expanded; users can also
  // toggle other menus open via openMenu.
  const routeMenu = findRouteMenu(location.pathname)
  const isMenuOpen = (name: string) => openMenu === name || routeMenu === name

  const isSubItemActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-[#e3e9f2] bg-white px-3 text-[#17233d] shadow-2xl transition-transform duration-300 ease-out lg:static lg:h-full lg:w-[216px] lg:shrink-0 lg:translate-x-0 lg:rounded-[22px] lg:border lg:border-[#e3e9f2] lg:shadow-[0_14px_35px_-28px_rgba(37,72,112,0.4)] xl:w-[224px] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-[72px] shrink-0 items-center border-b border-[#edf1f6] px-2">
        <NavLink to={routes.virtualMachines} className="flex min-w-0 items-center gap-2.5" aria-label="ABCO home">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0d91d7] text-xs font-semibold text-white shadow-[0_7px_16px_-8px_rgba(13,145,215,0.8)]">
            A
          </span>
          <span>
            <span className="block truncate text-[13px] font-semibold text-[#17233d]">ABCO Console</span>
            <span className="block truncate text-[10px] text-[#7c8aa0]">Business continuity</span>
          </span>
        </NavLink>
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto py-5">
        <nav className="mb-6" aria-label="Main navigation">
          <h2 className="mb-2 px-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#97a3b6]">
            Menu
          </h2>

          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      type="button"
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${isMenuOpen(item.name) ? 'bg-[#eef4ff] text-[#3566d6]' : 'text-[#44536c] hover:bg-[#f5f7fa] hover:text-[#263750]'}`}
                      onClick={() => {
                        setOpenMenu((current) => (current === item.name ? '' : item.name))
                      }}
                    >
                      <span className={isMenuOpen(item.name) ? 'text-[#3566d6]' : 'text-[#7b89a0]'}>{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <ChevronDownIcon className={`size-4 transition-transform ${isMenuOpen(item.name) ? 'rotate-180 text-[#3566d6]' : 'text-[#8996aa]'}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${isMenuOpen(item.name) ? 'max-h-[34rem]' : 'max-h-0'}`}>
                        <ul className="ml-[18px] mt-1 space-y-0.5 border-l border-[#e0e6ef] pl-3">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <NavLink
                                to={subItem.path}
                                onClick={closeMobileSidebar}
                                className={() => `block truncate rounded-lg px-2.5 py-2 text-xs font-medium transition ${isSubItemActive(subItem.path) ? 'bg-[#eef2fa] text-[#3566d6]' : 'text-[#5e6e86] hover:bg-[#f5f7fa] hover:text-[#263750]'}`}
                              >
                                {subItem.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                  </>
                ) : item.path ? (
                  <NavLink
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) => `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${isActive ? 'bg-[#eef4ff] text-[#3566d6]' : 'text-[#44536c] hover:bg-[#f5f7fa] hover:text-[#263750]'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? 'text-[#3566d6]' : 'text-[#7b89a0]'}>{item.icon}</span>
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
