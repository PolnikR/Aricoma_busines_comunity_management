import { NavLink } from 'react-router-dom'
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
    path: routes.platformAdministration,
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
  const [openMenu, setOpenMenu] = useState('Discovery & Inventory')

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#cfe6f8] bg-[#eef8ff] px-4 text-[#17233d] shadow-2xl transition-transform duration-300 ease-out lg:static lg:h-full lg:w-[244px] lg:shrink-0 lg:translate-x-0 lg:rounded-[28px] lg:border lg:border-white/70 lg:shadow-[0_24px_70px_-36px_rgba(17,91,146,0.42)] xl:w-[256px] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex h-[88px] shrink-0 items-center border-b border-[#d6eaf8] px-2">
        <NavLink to={routes.virtualMachines} className="flex items-center gap-3" aria-label="ABCO home">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#0d91d7] text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(13,145,215,0.8)]">
            A
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#17233d]">ABCO Console</span>
            <span className="block text-[11px] text-[#7587a1]">Business continuity</span>
          </span>
        </NavLink>
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto py-6">
        <nav className="mb-6" aria-label="Main navigation">
          <h2 className="mb-4 px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#178ccd]">
            Menu
          </h2>

          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      type="button"
                      className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${openMenu === item.name ? 'border border-[#b8def6] bg-white/90 text-[#087fca] shadow-sm' : 'text-[#40516c] hover:bg-white/60'}`}
                      onClick={() => {
                        setOpenMenu((current) => (current === item.name ? '' : item.name))
                      }}
                    >
                      <span className={openMenu === item.name ? 'text-[#0d91d7]' : 'text-[#71849f]'}>{item.icon}</span>
                      <span>{item.name}</span>
                      <ChevronDownIcon className={`ml-auto size-5 transition-transform ${openMenu === item.name ? 'rotate-180 text-[#0d91d7]' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openMenu === item.name ? 'max-h-32' : 'max-h-0'}`}>
                        <ul className="ml-8 mt-2 space-y-1 border-l border-[#b9dff5] pl-3">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <NavLink
                                to={subItem.path}
                                onClick={closeMobileSidebar}
                                className={({ isActive }) => `block rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#596b85] hover:bg-white/60 hover:text-[#087fca]'}`}
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
                    className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive ? 'border border-[#b8def6] bg-white/90 text-[#087fca] shadow-sm' : 'text-[#40516c] hover:bg-white/60'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? 'text-[#0d91d7]' : 'text-[#71849f]'}>{item.icon}</span>
                        <span>{item.name}</span>
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
