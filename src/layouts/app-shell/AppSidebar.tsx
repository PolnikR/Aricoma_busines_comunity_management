import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { routes } from '@/app/routes'
import { ChevronDownIcon, GridIcon, ServerIcon, SettingsIcon, PlugIcon } from '@/shared/icons/Icons'
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
  const { isExpanded, isHovered, isMobileOpen, setIsHovered, closeMobileSidebar } = useSidebar()
  const [openMenu, setOpenMenu] = useState('Discovery & Inventory')
  const canShowText = isExpanded || isHovered || isMobileOpen

  const sidebarWidthClass = useMemo(() => {
    if (isExpanded || isHovered || isMobileOpen) {
      return 'w-[290px]'
    }

    return 'w-[90px]'
  }, [isExpanded, isHovered, isMobileOpen])

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${sidebarWidthClass} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0`}
      onMouseEnter={() => {
        if (!isExpanded) {
          setIsHovered(true)
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false)
      }}
    >
      <div className={`flex py-8 ${canShowText ? 'justify-start' : 'justify-center'}`}>
        <NavLink to={routes.virtualMachines} className="flex items-center gap-3" aria-label="ABCO home">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-theme-xs">
            A
          </span>
          {canShowText ? (
            <span>
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">ABCO</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Recovery console</span>
            </span>
          ) : null}
        </NavLink>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6" aria-label="Main navigation">
          <h2 className={`mb-4 flex text-xs uppercase leading-5 text-gray-400 ${canShowText ? 'justify-start' : 'justify-center'}`}>
            {canShowText ? 'Menu' : <GridIcon />}
          </h2>

          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      type="button"
                      className={`menu-item group cursor-pointer ${openMenu === item.name ? 'menu-item-active' : 'menu-item-inactive'} ${canShowText ? 'justify-start' : 'justify-center'}`}
                      onClick={() => {
                        setOpenMenu((current) => (current === item.name ? '' : item.name))
                      }}
                    >
                      <span className={openMenu === item.name ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}>{item.icon}</span>
                      {canShowText ? <span className="menu-item-text">{item.name}</span> : null}
                      {canShowText ? <ChevronDownIcon className={`ml-auto size-5 transition-transform ${openMenu === item.name ? 'rotate-180 text-brand-500' : ''}`} /> : null}
                    </button>
                    {canShowText ? (
                      <div className={`overflow-hidden transition-all duration-300 ${openMenu === item.name ? 'max-h-32' : 'max-h-0'}`}>
                        <ul className="ml-9 mt-2 space-y-1">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <NavLink
                                to={subItem.path}
                                onClick={closeMobileSidebar}
                                className={({ isActive }) => `menu-dropdown-item ${isActive ? 'menu-dropdown-item-active' : 'menu-dropdown-item-inactive'}`}
                              >
                                {subItem.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : item.path ? (
                  <NavLink
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) => `menu-item group ${isActive ? 'menu-item-active' : 'menu-item-inactive'} ${canShowText ? 'justify-start' : 'justify-center'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <span className={isActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'}>{item.icon}</span>
                        {canShowText ? <span className="menu-item-text">{item.name}</span> : null}
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