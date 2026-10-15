import { describe, expect, it } from 'vitest'
import { resolveVmwareInitialFilters } from './resolveVmwareInitialFilters'

const saved = {
  resourceTab: 'vmware' as const,
  initialized: true as const,
  filters: { search: 'saved', tags: ['one', 'two'], powerState: 'on', connectionState: '', cluster: '', untagged: false },
}

describe('resolveVmwareInitialFilters', () => {
  it('enforces fixed scope ahead of URL and saved filters', () => {
    expect(resolveVmwareInitialFilters({ id: 'vm', vmPrefix: ' fixed ', vmTags: ['', ' prod '] }, new URLSearchParams('search=url'), saved))
      .toEqual({ search: 'fixed', tags: ['prod'], powerState: '', connectionState: '', cluster: '', untagged: false })
  })

  it('restores the supplied snapshot on a bare target URL without narrowing multiple tags', () => {
    expect(resolveVmwareInitialFilters({ id: 'vm', role: 'target' }, new URLSearchParams(), saved)).toEqual(saved.filters)
  })

  it('uses explicit URL filters only for the active provider scope', () => {
    const provider = { id: 'vm', role: 'target' as const }
    expect(resolveVmwareInitialFilters(provider, new URLSearchParams('search=url&tags=blue,green'), saved))
      .toMatchObject({ search: 'url', tags: ['blue'] })
    expect(resolveVmwareInitialFilters(provider, new URLSearchParams('search=url&vmwareActiveProvider=source:vm'), saved))
      .toEqual(saved.filters)
    expect(resolveVmwareInitialFilters(provider, new URLSearchParams('vmwareActiveProvider=target:vm'), saved))
      .toMatchObject({ search: '', tags: [] })
  })

  it('falls back to empty filters when no scope, URL or snapshot is available', () => {
    expect(resolveVmwareInitialFilters({ id: 'vm' }, new URLSearchParams()))
      .toEqual({ search: '', tags: [], powerState: '', connectionState: '', cluster: '', untagged: false })
  })
})
