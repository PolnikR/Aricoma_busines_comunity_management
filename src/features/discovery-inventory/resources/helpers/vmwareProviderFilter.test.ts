import { describe, expect, it } from 'vitest'
import { resolveVmwareProviderFilter } from './vmwareProviderFilter'

describe('resolveVmwareProviderFilter', () => {
  it('normalizes every provider tag, preserving order and case while removing empty and exact duplicate tags', () => {
    expect(resolveVmwareProviderFilter({
      vmPrefix: ' prod- ',
      vmTags: [' ', ' ABCO-managed ', ' database ', 'ABCO-managed', '', 'abco-managed', 'database '],
    })).toEqual({
      isFixed: true,
      prefix: 'prod-',
      tag: 'ABCO-managed',
      filters: { search: 'prod-', tags: ['ABCO-managed', 'database', 'abco-managed'] },
    })
  })

  it('supports a prefix-only provider filter', () => {
    expect(resolveVmwareProviderFilter({ vmPrefix: 'prod-', vmTags: [] })).toMatchObject({
      isFixed: true,
      prefix: 'prod-',
      tag: '',
      filters: { search: 'prod-', tags: [] },
    })
  })

  it('supports a tag-only provider filter', () => {
    expect(resolveVmwareProviderFilter({ vmPrefix: null, vmTags: ['ABCO-managed'] })).toMatchObject({
      isFixed: true,
      prefix: '',
      tag: 'ABCO-managed',
      filters: { search: '', tags: ['ABCO-managed'] },
    })
  })

  it('keeps all normalized tags in a tag-only fixed scope', () => {
    expect(resolveVmwareProviderFilter({ vmTags: [' ', ' prod ', 'db', 'prod'] })).toEqual({
      isFixed: true,
      prefix: '',
      tag: 'prod',
      filters: { search: '', tags: ['prod', 'db'] },
    })
  })

  it('returns an editable empty state when no provider filter is configured', () => {
    expect(resolveVmwareProviderFilter({ vmPrefix: '  ', vmTags: ['', '  '] })).toEqual({
      isFixed: false,
      prefix: '',
      tag: '',
      filters: { search: '', tags: [] },
    })
  })
})
