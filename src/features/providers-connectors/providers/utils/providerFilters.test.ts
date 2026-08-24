import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { getProvidersByTypeAndRole } from './providerFilters'

describe('providerFilters', () => {
  const vmwareSourceProvider: ProviderRecord = {
    id: 'vmware-source-01',
    name: 'VMware Source',
    description: '',
    type: 'VMWARE',
    role: 'source',
    ipAddress: '10.0.0.1',
    port: 443,
    credentialId: null,
    credentialStatus: 'none',
  }
  const vmwareTargetProvider: ProviderRecord = {
    ...vmwareSourceProvider,
    id: 'vmware-target-01',
    name: 'VMware Target',
    role: 'target',
  }
  const vmwareLegacyProvider: ProviderRecord = {
    ...vmwareSourceProvider,
    id: 'vmware-legacy-01',
    name: 'VMware Legacy',
    role: undefined,
  }
  const flashProvider: ProviderRecord = {
    ...vmwareSourceProvider,
    id: 'flash-01',
    type: 'FLASHCOPY',
  }

  describe('getProvidersByTypeAndRole — source', () => {
    it('returns providers matching type and excludes target role', () => {
      const providers = [vmwareSourceProvider, vmwareTargetProvider, flashProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'source')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('vmware-source-01')
    })

    it('treats missing role as source', () => {
      const providers = [vmwareLegacyProvider, vmwareTargetProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'source')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('vmware-legacy-01')
    })

    it('excludes providers with non-matching type regardless of role', () => {
      const providers = [vmwareSourceProvider, flashProvider]
      const result = getProvidersByTypeAndRole(providers, 'FLASHCOPY', 'source')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('flash-01')
      expect(result.some(p => p.type === 'VMWARE')).toBe(false)
    })

    it('returns empty array when no providers match', () => {
      const providers = [vmwareTargetProvider]
      const result = getProvidersByTypeAndRole(providers, 'FLASHCOPY', 'source')
      expect(result).toHaveLength(0)
    })

    it('returns empty array when all matching type providers are target role', () => {
      const providers = [vmwareTargetProvider, vmwareTargetProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'source')
      expect(result).toHaveLength(0)
    })
  })

  describe('getProvidersByTypeAndRole — target', () => {
    it('returns providers matching type and including only target role', () => {
      const providers = [vmwareSourceProvider, vmwareTargetProvider, flashProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('vmware-target-01')
    })

    it('excludes providers with missing role', () => {
      const providers = [vmwareLegacyProvider, vmwareTargetProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('vmware-target-01')
    })

    it('returns empty array when no target role providers of type exist', () => {
      const providers = [vmwareSourceProvider, vmwareLegacyProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      expect(result).toHaveLength(0)
    })

    it('returns empty array when matching type providers are only source role', () => {
      const providers = [vmwareSourceProvider, vmwareLegacyProvider]
      const result = getProvidersByTypeAndRole(providers, 'VMWARE', 'target')
      expect(result).toHaveLength(0)
    })
  })
})
