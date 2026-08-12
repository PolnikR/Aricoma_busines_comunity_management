import { describe, expect, it } from 'vitest'
import { createAppRouter } from './createAppRouter'

function collectPaths(routes: ReturnType<typeof createAppRouter>['routes']): string[] {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...(route.children ? collectPaths(route.children) : []),
  ])
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
    expect(paths).toContain('discovery-inventory/virtual-machines')
    expect(paths).toContain('platform-administration/platform-providers')
    expect(paths).toContain('recovery-actions')
    expect(paths).toContain('validate')
    expect(paths).toContain('execute')
    expect(paths).toContain('schedule')
    expect(paths).toContain('history')

    router.dispose()
  })
})
