import { describe, expect, it } from 'vitest'
import type { RouteObject } from 'react-router'
import { createAppRouter } from './createAppRouter'

function collectPaths(routes: RouteObject[]): string[] {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(route.children ? collectPaths(route.children) : []),
  ])
}

function findRouteByPathChain(
  routes: RouteObject[],
  pathChain: string[],
): RouteObject | undefined {
  const [path, ...remaining] = pathChain
  for (const candidate of routes) {
    if (candidate.path === path) {
      if (remaining.length === 0) return candidate
      return candidate.children ? findRouteByPathChain(candidate.children, remaining) : undefined
    }
    if (candidate.children) {
      const nested = findRouteByPathChain(candidate.children, pathChain)
      if (nested) return nested
    }
  }
  return undefined
}

describe('createAppRouter', () => {
  it('creates a data router containing the recovery builder and editor routes', () => {
    const router = createAppRouter()
    const paths = collectPaths(router.routes)

    expect(paths).toContain('recovery-applications')
    expect(paths).toContain('recovery-groups')
    expect(paths).toContain('recovery-policies')
    expect(paths).toContain('snapshot')
    expect(paths).toContain('application-recovery')
    expect(paths).toContain('clean-room')
    expect(paths).toContain('recovery-app-policies')
    expect(paths).toContain('create')
    expect(paths).toContain(':id/edit')
    expect(paths).toContain('discovery-inventory/resources')
    expect(paths).toContain('discovery-inventory/resources-ise')
    expect(paths).toContain('discovery-inventory/resources/source')
    expect(paths).toContain('discovery-inventory/resources/target')
    expect(paths).toContain('discovery-inventory/virtual-machines')
    expect(paths).toContain('platform-administration/platform-providers')
    expect(paths).toContain('recovery-actions')
    expect(paths).toContain('validate')
    expect(paths).toContain('execute')
    expect(paths).toContain('schedule')
    expect(paths).toContain('history')

    router.dispose()
  })

  it('marks migrated table routes and recovery builders for contained desktop scrolling', () => {
    const router = createAppRouter()
    const containedRoutes = [
      ['recovery-plans', 'recovery-groups', 'create'],
      ['recovery-plans', 'recovery-groups', ':id/edit'],
      ['recovery-plans', 'recovery-applications', 'create'],
      ['recovery-plans', 'recovery-applications', ':id/edit'],
      ['providers-connectors/providers'],
      ['providers-connectors/credentials'],
      ['platform-administration/platform-providers'],
      ['platform-administration/configuration'],
      ['platform-administration/identity-access'],
      ['recovery-plans', 'recovery-runs'],
      ['recovery-plans', 'recovery-policies', 'snapshot'],
      ['recovery-plans', 'recovery-policies', 'application-recovery'],
      ['recovery-plans', 'recovery-policies', 'clean-room'],
      ['recovery-plans', 'policy-sets'],
      ['recovery-actions', 'validate'],
      ['recovery-actions', 'execute'],
      ['recovery-actions', 'schedule'],
      ['recovery-actions', 'history'],
    ]

    for (const pathChain of containedRoutes) {
      expect(findRouteByPathChain(router.routes, pathChain)?.handle).toEqual({ contentScroll: 'contained' })
    }

    expect(findRouteByPathChain(router.routes, ['recovery-plans', 'recovery-groups'])?.children?.[0]?.handle).toEqual({ contentScroll: 'contained' })
    expect(findRouteByPathChain(router.routes, ['recovery-plans', 'recovery-applications'])?.children?.[0]?.handle).toEqual({ contentScroll: 'contained' })

    router.dispose()
  })

})
