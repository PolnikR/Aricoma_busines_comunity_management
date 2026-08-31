import { NavLink, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { routes } from '@/app/routes'
import { useTranslation } from '@/hooks/useTranslation'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExecutionIcon,
  LayersIcon,
  PlugIcon,
  ServerIcon,
  SettingsIcon,
} from '@/shared/icons/Icons'
import { SidebarFlyout } from './SidebarFlyout'
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
      { name: 'Platform Providers', path: routes.platformProviders },
      { name: 'Configuration', path: routes.platformConfiguration },
      { name: 'Identity & Access', path: routes.platformIdentityAccess },
      { name: 'Audit', path: routes.platformAuditRetention },
    ],
  },
  {
    name: 'Providers & Connectors',
    icon: <PlugIcon />,
    subItems: [
      { name: 'Providers', path: routes.providersConnectors },
      { name: 'Credentials', path: routes.providerCredentials },
      { name: 'Discovery Settings', path: routes.providerDiscoverySettings },
    ],
  },
  {
    name: 'Discovery & Inventory',
    icon: <ServerIcon />,
    subItems: [
      { name: 'Resources', path: routes.resources },
      { name: 'Resources ISE', path: routes.resourcesIse },
      { name: 'Infrastructure Topology', path: routes.infrastructure },
      { name: 'Discovery Jobs', path: routes.discoveryJobs },
    ],
  },
  {
    name: 'Storage Orchestration',
    icon: <LayersIcon />,
    path: routes.storageOrchestration,
  },
  {
    name: 'Recovery Plans',
    icon: <LayersIcon />,
    subItems: [
      { name: 'Recovery Applications', path: routes.recoveryApplications },
      { name: 'Recovery Groups', path: routes.recoveryGroups },
      { name: 'Recovery Policies', path: routes.recoveryPolicies },
      { name: 'Policy Sets', path: routes.policySets },
      { name: 'Recovery Runs', path: routes.recoveryRuns },
    ],
  },
  {
    name: 'Recovery Actions',
    icon: <ExecutionIcon />,
    path: routes.recoveryActions,
  },
]

const navKeyMap: Record<string, string> = {
  'Platform Administration': 'nav.administration',
  'Platform Providers': 'nav.administration.platformProviders',
  'Configuration': 'nav.administration.configuration',
  'Identity & Access': 'nav.administration.identity',
  'Audit': 'nav.administration.audit',
  'Providers & Connectors': 'nav.providers',
  'Providers': 'nav.providers.providers',
  'Credentials': 'nav.providers.credentials',
  'Discovery Settings': 'nav.providers.discovery',
  'Discovery & Inventory': 'nav.discovery',
  'Resources': 'nav.discovery.resources',
  'Resources ISE': 'nav.discovery.resourcesIse',
  'Infrastructure Topology': 'nav.discovery.infrastructure',
  'Discovery Jobs': 'nav.discovery.jobs',
  'Storage Orchestration': 'nav.storage',
  'Recovery Plans': 'nav.recovery',
  'Recovery Applications': 'nav.recovery.applications',
  'Recovery Groups': 'nav.recovery.groups',
  'Recovery Policies': 'nav.recovery.policies',
  'Policy Sets': 'nav.recovery.policySets',
  'Recovery Runs': 'nav.recovery.runs',
  'Recovery Actions': 'nav.recoveryActions',
}

function findRouteMenu(pathname: string): string | undefined {
  const activeItem = navItems.find((item) => item.subItems?.some((subItem) => pathname === subItem.path || pathname.startsWith(`${subItem.path}/`)))
  return activeItem?.name
}

function getTranslationKey(name: string): string {
  return navKeyMap[name] ?? name
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { isMobileOpen, isCollapsed, closeMobileSidebar, toggleSidebar } = useSidebar()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState<string>(() => findRouteMenu(location.pathname) ?? 'Discovery & Inventory')

  // The menu that owns the current route is always expanded; users can also
  // toggle other menus open via openMenu.
  const routeMenu = findRouteMenu(location.pathname)
  const isMenuOpen = (name: string) => openMenu === name || routeMenu === name

  const isSubItemActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-border bg-surface px-3 text-text-primary shadow-2xl transition-transform duration-300 ease-out lg:static lg:h-full lg:shrink-0 lg:translate-x-0 lg:rounded-[22px] lg:border lg:border-border lg:shadow-[0_14px_35px_-28px_rgba(37,72,112,0.4)] ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:w-18 lg:min-w-18 lg:max-w-18 lg:px-2' : 'lg:w-max lg:min-w-[272px] lg:max-w-[min(352px,32vw)]'}`}
    >
      <div className={`flex h-[72px] shrink-0 items-center border-b border-border ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
        {isCollapsed ? null : (
          <NavLink to={routes.resources} className="flex min-w-0 items-center gap-2.5" aria-label="Aricoma home">
            <img src="/aricoma-logo.png" alt="Aricoma" className="size-9 shrink-0 rounded-lg" />
            <span>
              <span className="block truncate text-[13px] font-semibold text-text-primary">{t('header.appName')}</span>
              <span className="block truncate text-[10px] text-text-muted">{t('header.tagline')}</span>
            </span>
          </NavLink>
        )}

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? t('nav.expand') : t('nav.collapse')}
          className={`hidden shrink-0 rounded-lg p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-accent xl:block ${isCollapsed ? '' : 'ml-auto'}`}
        >
          {isCollapsed ? <ChevronRightIcon className="size-4" /> : <ChevronLeftIcon className="size-4" />}
        </button>
      </div>

      {/* The collapsed rail must not clip its flyouts, and 6 icons never need to scroll. */}
      <div className={`custom-scrollbar flex flex-1 flex-col py-5 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
        <nav className="mb-6" aria-label="Main navigation">
          <h2 className={isCollapsed ? 'sr-only' : 'mb-2 px-2.5 text-[9px] font-medium uppercase tracking-[0.12em] text-text-subtle'}>
            {t('nav.menu')}
          </h2>

          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.name} className="group relative">
                {item.subItems ? (
                  <>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-xs font-medium transition ${isCollapsed ? 'justify-center px-0' : 'px-2.5'} ${isMenuOpen(item.name) ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:bg-surface-muted hover:text-text-secondary'}`}
                      onClick={() => {
                        setOpenMenu((current) => (current === item.name ? '' : item.name))
                      }}
                    >
                      <span className={`shrink-0 ${isMenuOpen(item.name) ? 'text-accent' : 'text-text-muted'}`}>{item.icon}</span>
                      <span className={isCollapsed ? 'sr-only' : 'min-w-0 flex-1 whitespace-normal leading-4 [overflow-wrap:anywhere]'}>{t(getTranslationKey(item.name))}</span>
                      {isCollapsed ? null : (
                        <ChevronDownIcon className={`size-4 shrink-0 transition-transform ${isMenuOpen(item.name) ? 'rotate-180 text-accent' : 'text-text-muted'}`} />
                      )}
                    </button>
                    {isCollapsed ? (
                      <SidebarFlyout
                        title={t(getTranslationKey(item.name))}
                        items={item.subItems.map((subItem) => ({
                          name: t(getTranslationKey(subItem.name)),
                          path: subItem.path,
                        }))}
                        isItemActive={isSubItemActive}
                        onNavigate={closeMobileSidebar}
                      />
                    ) : (
                    <div className={`overflow-hidden transition-all duration-300 ${isMenuOpen(item.name) ? 'max-h-[34rem]' : 'max-h-0'}`}>
                        <ul className="ml-[18px] mt-1 space-y-0.5 border-l border-border pl-3">
                          {item.subItems.map((subItem) => (
                            <li key={subItem.path}>
                              <NavLink
                                to={subItem.path}
                                onClick={closeMobileSidebar}
                                className={() => `block rounded-lg px-2.5 py-2 text-xs font-medium leading-4 whitespace-normal [overflow-wrap:anywhere] transition ${isSubItemActive(subItem.path) ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-muted hover:text-text-secondary'}`}
                              >
                                {t(getTranslationKey(subItem.name))}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : item.path ? (
                  <>
                  <NavLink
                    to={item.path}
                    onClick={closeMobileSidebar}
                    className={({ isActive }) => {
                      const routeActive = isActive || (item.path === routes.recoveryActions && location.pathname.startsWith(`${routes.recoveryActions}/`))
                      return `flex items-center gap-2.5 rounded-lg py-2 text-xs font-medium transition ${isCollapsed ? 'justify-center px-0' : 'px-2.5'} ${routeActive ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:bg-surface-muted hover:text-text-secondary'}`
                    }}
                  >
                    {({ isActive }) => {
                      const routeActive = isActive || (item.path === routes.recoveryActions && location.pathname.startsWith(`${routes.recoveryActions}/`))
                      return (
                      <>
                        <span className={`shrink-0 ${routeActive ? 'text-accent' : 'text-text-muted'}`}>{item.icon}</span>
                        <span className={isCollapsed ? 'sr-only' : 'min-w-0 flex-1 whitespace-normal leading-4 [overflow-wrap:anywhere]'}>{t(getTranslationKey(item.name))}</span>
                      </>
                      )
                    }}
                  </NavLink>
                  {isCollapsed ? (
                    <SidebarFlyout
                      title={t(getTranslationKey(item.name))}
                      items={[]}
                      isItemActive={isSubItemActive}
                      onNavigate={closeMobileSidebar}
                    />
                  ) : null}
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
