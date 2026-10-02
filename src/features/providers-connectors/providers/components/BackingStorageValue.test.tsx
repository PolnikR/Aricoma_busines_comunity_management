import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { BackingStorageValue } from './BackingStorageValue'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function provider(id: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name: `Name ${id}`, type, role: 'source', credentialStatus: 'ok', ...extra }
}

describe('BackingStorageValue', () => {
  it('lists resolved, unavailable and mismatched backing storage as returned by the API', () => {
    const providers = [
      provider('c-1', 'IBM_POWER', { backingStorageProviderIds: ['s-1', 'missing', 'c-2'] }),
      provider('c-2', 'VMWARE'),
      provider('s-1', 'HITACHI'),
    ]
    render(<BackingStorageValue providerId="c-1" providers={providers} />)

    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Name s-1 (s-1)',
      'missing (Unavailable)',
      'Name c-2 (c-2) · Mismatch',
    ])
  })

  it('shows None for a compute provider without backing storage', () => {
    render(<BackingStorageValue providerId="c-1" providers={[provider('c-1', 'VMWARE')]} />)

    expect(screen.getByText('None')).toBeInTheDocument()
  })
})
