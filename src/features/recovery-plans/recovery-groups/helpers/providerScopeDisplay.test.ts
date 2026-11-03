import { describe, expect, it } from 'vitest'
import { getProviderScopeDisplay } from './providerScopeDisplay'

describe('getProviderScopeDisplay', () => {
  it('counts normalized unique VMware tags after the first display tag', () => {
    expect(getProviderScopeDisplay({
      type: 'VMWARE',
      vmPrefix: ' TEST- ',
      vmTags: [' ', ' WEB ', 'WEB', ' DB ', 'DB', 'db', ''],
    })).toEqual({ prefix: 'TEST-', tag: 'WEB', additionalTagCount: 2 })
  })

  it('does not count repeated copies of the first VMware tag as additional tags', () => {
    expect(getProviderScopeDisplay({ type: 'VMWARE', vmTags: [' WEB ', 'WEB', ' '] }))
      .toEqual({ prefix: '', tag: 'WEB', additionalTagCount: 0 })
  })

  it.each([
    [{ type: 'VMWARE', vmTags: [' ', ''] }, null],
    [{ type: 'VMWARE', vmPrefix: ' TEST- ' }, { prefix: 'TEST-', tag: '', additionalTagCount: 0 }],
    [{ type: 'VMWARE', vmTags: [' WEB '] }, { prefix: '', tag: 'WEB', additionalTagCount: 0 }],
    [{ type: 'IBM_POWER', vmTags: ['WEB', 'DB'] }, null],
    [{ type: 'IBM_POWER', vmPrefix: ' TEST- ', vmTags: ['WEB', 'DB'] }, { prefix: 'TEST-', tag: '', additionalTagCount: 0 }],
  ] as const)('preserves the displayed scope for %j', (provider, expected) => {
    expect(getProviderScopeDisplay(provider)).toEqual(expected)
  })
})
