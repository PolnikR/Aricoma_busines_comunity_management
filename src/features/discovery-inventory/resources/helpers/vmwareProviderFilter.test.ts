import { describe, expect, it } from 'vitest'
import { resolveVmwareProviderFilter } from './vmwareProviderFilter'

describe('resolveVmwareProviderFilter', () => {
  it('normalizes a prefix and the first non-empty tag into a fixed filter', () => {
    expect(resolveVmwareProviderFilter({ vmPrefix: ' prod- ', vmTags: [' ', ' ABCO-managed '] })).toEqual({
      isFixed: true,
      prefix: 'prod-',
      tag: 'ABCO-managed',
      filters: { search: 'prod-', tags: ['ABCO-managed'] },
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

  it('returns an editable empty state when no provider filter is configured', () => {
    expect(resolveVmwareProviderFilter({ vmPrefix: '  ', vmTags: ['', '  '] })).toEqual({
      isFixed: false,
      prefix: '',
      tag: '',
      filters: { search: '', tags: [] },
    })
  })
})
