import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { routes } from '@/app/routes'
import { ChevronDownIcon, ServerIcon, SettingsIcon, PlugIcon } from '@/shared/icons/Icons'
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
      { name: 'Overview', path: `${routes.platformAdministration}#overview` },
      { name: 'Configuration', path: `${routes.platformAdministration}#configuration` },
      { name: 'Users & Roles', path: `${routes.platformAdministration}#users-roles` },
      { name: 'Secrets', path: `${routes.platformAdministration}#secrets` },
      { name: 'Audit', path: `${routes.platformAdministration}#audit` },
      { name: 'Notifications', path: `${routes.platformAdministration}#notifications` },
      { name: 'Certificates', path: `${routes.platformAdministration}#certificates` },
      { name: 'Backup & Restore', path: `${routes.platformAdministration}#backup-restore` },
      { name: 'Diagnostics', path: `${routes.platformAdministration}#diagnostics` },
      { name: 'Lifecycle', path: `${routes.platformAdministration}#lifecycle` },
      { name: 'Data Retention', path: `${routes.platformAdministration}#data-retention` },
    ],
  },
  {
    name: 'Providers & Connectors',
    icon: <PlugIcon />,
    path: routes.providersConnectors,
  },
  {
    name: 'Discovery & Inventory',
    icon: <ServerIcon />,
    subItems: [
      { name: 'Virtual Machines', path: routes.virtualMachines },
      { name: 'Infrastructure', path: routes.infrastructure },
    ],
  },
]

export function AppSidebar() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState(() => location.pathname === routes.platformAdministration ? 'Platform Administration' : 'Discovery & Inventory')

  const isSubItemActive = (path: string) => {
    const [pathname, hash = ''] = path.split('#')
    if (location.pathname !== pathname) return false
    if (!hash) return true
    return location.hash === `#${hash}` || (!location.hash && hash === 'overview')
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
                      className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition ${openMenu === item.name ? 'bg-[#eef4ff] text-[#3566d6]' : 'text-[#44536c] hover:bg-[#f5f7fa] hover:text-[#263750]'}`}
                      onClick={() => {
                        setOpenMenu((current) => (current === item.name ? '' : item.name))
                      }}
                    >
                      <span className={openMenu === item.name ? 'text-[#3566d6]' : 'text-[#7b89a0]'}>{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <ChevronDownIcon className={`size-4 transition-transform ${openMenu === item.name ? 'rotate-180 text-[#3566d6]' : 'text-[#8996aa]'}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openMenu === item.name ? 'max-h-[34rem]' : 'max-h-0'}`}>
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
