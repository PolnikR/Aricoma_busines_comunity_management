import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { createAppRouter } from './createAppRouter'
import { platformAdministrationPages } from './modulePageConfigs'
import { routes } from './routes'

function findRoute(routes: RouteObject[], path: string): RouteObject | undefined {
  for (const route of routes) {
    if (route.path === path) return route
    const nested = route.children ? findRoute(route.children, path) : undefined
    if (nested) return nested
  }
  return undefined
}

describe('Resources routes', () => {
  it('contains source and target content inside the desktop AppShell viewport', () => {
    const router = createAppRouter()

    expect(findRoute(router.routes, 'discovery-inventory/resources')?.handle)
      .toEqual({ contentScroll: 'contained' })
    expect(findRoute(router.routes, 'discovery-inventory/resources-ise')?.handle)
      .toEqual({ contentScroll: 'contained' })

    router.dispose()
  })

  it('gives Audit its own contained route instead of a module placeholder', () => {
    const router = createAppRouter()

    expect(platformAdministrationPages.some(page => page.path === routes.platformAuditRetention)).toBe(false)
    expect(findRoute(router.routes, 'platform-administration/audit-retention')?.handle)
      .toEqual({ contentScroll: 'contained' })

    router.dispose()
  })
})
