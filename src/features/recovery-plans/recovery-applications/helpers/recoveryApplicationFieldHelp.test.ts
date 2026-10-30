import { describe, expect, it } from 'vitest'
import { recoveryApplicationHelpKey, recoveryApplicationTierOrderHelpKey } from './recoveryApplicationFieldHelp'

describe('application technical help context', () => {
  it.each(['source', 'target', 'workloads', 'policySet', 'template'] as const)('maps %s without guessing an unknown platform', field => {
    expect(recoveryApplicationHelpKey(field, 'VMWARE')).toBe(`recoveryApplications.fieldHelp.${field}.vmware`)
    expect(recoveryApplicationHelpKey(field, 'ibm_power')).toBe(`recoveryApplications.fieldHelp.${field}.ibmPower`)
    for (const platform of [null, undefined, '', 'FLASHCOPY', 'provider-id']) {
      expect(recoveryApplicationHelpKey(field, platform)).toBe(`recoveryApplications.fieldHelp.${field}.generic`)
    }
  })

  it('uses a known explicit version independently of catalog availability', () => {
    expect(recoveryApplicationTierOrderHelpKey('IBM_POWER', 'v2')).toBe('recoveryApplications.fieldHelp.tierOrder.ibmPower.v2')
    expect(recoveryApplicationTierOrderHelpKey('ibm_power', 'v1')).toBe('recoveryApplications.fieldHelp.tierOrder.ibmPower.v1')
    expect(recoveryApplicationTierOrderHelpKey('VMWARE', 'v1')).toBe('recoveryApplications.fieldHelp.tierOrder.vmware.v1')
    expect(recoveryApplicationTierOrderHelpKey('VMWARE', 'v2')).toBe('recoveryApplications.fieldHelp.tierOrder.vmware.v2')
    expect(recoveryApplicationTierOrderHelpKey('IBM_POWER', 'v3')).toBe('recoveryApplications.fieldHelp.tierOrder.ibmPower.v3')
  })

  it('resolves null only from a verified, unique default for the same platform', () => {
    const templates = [{ platform: 'ibm_power', version: 'v2', default: true }]
    expect(recoveryApplicationTierOrderHelpKey('IBM_POWER', null, { templates, verified: true })).toBe('recoveryApplications.fieldHelp.tierOrder.ibmPower.v2')
    for (const catalog of [undefined, { templates, verified: false }, { templates: [], verified: true },
      { templates: [...templates, { platform: 'ibm_power', version: 'v1', default: true }], verified: true }]) {
      expect(recoveryApplicationTierOrderHelpKey('IBM_POWER', null, catalog)).toBe('recoveryApplications.fieldHelp.tierOrder.generic')
    }
    expect(recoveryApplicationTierOrderHelpKey('VMWARE', null, { templates, verified: true })).toBe('recoveryApplications.fieldHelp.tierOrder.generic')
  })

  it('does not invent layouts for future templates or unsupported platforms', () => {
    for (const [platform, version] of [['VMWARE', 'v9'], ['IBM_POWER', 'v9'], ['unknown', 'v1']]) {
      expect(recoveryApplicationTierOrderHelpKey(platform, version)).toBe('recoveryApplications.fieldHelp.tierOrder.generic')
    }
  })

  it.each([['IBM_POWER', 'v3', 'ibmPower'], ['VMWARE', 'v2', 'vmware']])('uses a verified new default for %s', (platform, version, suffix) => {
    const templates = [{ platform, version, default: true }]
    expect(recoveryApplicationTierOrderHelpKey(platform, null, { templates, verified: true })).toBe(`recoveryApplications.fieldHelp.tierOrder.${suffix}.${version}`)
    expect(recoveryApplicationTierOrderHelpKey(platform, null, { templates, verified: false })).toBe('recoveryApplications.fieldHelp.tierOrder.generic')
  })
})
