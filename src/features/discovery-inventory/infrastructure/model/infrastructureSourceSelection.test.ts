import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  getInfrastructureProviders,
  getProviderTypeForPlatform,
  parseInfrastructurePlatform,
  resolveInfrastructureProvider,
} from './infrastructureSourceSelection'

const providers: ProviderRecord[] = [
  { id: 'vcenter-01', name: 'vCenter', description: '', type: 'VMWARE', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
  { id: 'flash-01', name: 'Flash', description: '', type: 'FLASHCOPY', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
  { id: 'power-01', name: 'Power', description: '', type: 'IBM_POWER', ipAddress: '', credentialId: null, credentialStatus: 'ok' },
]

describe('infrastructureSourceSelection', () => {
  it('parses only supported URL platform values', () => {
    expect(parseInfrastructurePlatform('ibm-power')).toBe('ibm-power')
    expect(parseInfrastructurePlatform('vmware')).toBe('vmware')
    expect(parseInfrastructurePlatform('flashsystem')).toBe('vmware')
    expect(getProviderTypeForPlatform('ibm-power')).toBe('IBM_POWER')
  })

  it('excludes providers that have no supported topology', () => {
    expect(getInfrastructureProviders(providers, 'vmware').map(({ id }) => id)).toEqual(['vcenter-01'])
    expect(getInfrastructureProviders(providers, 'ibm-power').map(({ id }) => id)).toEqual(['power-01'])
  })

  it('replaces an incompatible requested provider with the first compatible provider', () => {
    expect(resolveInfrastructureProvider(providers, 'ibm-power', 'vcenter-01')?.id).toBe('power-01')
    expect(resolveInfrastructureProvider(providers, 'ibm-power', 'power-01')?.id).toBe('power-01')
  })
})
