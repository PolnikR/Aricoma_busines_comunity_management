import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { ProviderRelationshipsContent } from './ProviderRelationshipsContent'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function provider(id: string, name: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name, type, role: 'source', credentialStatus: 'ok', ...extra }
}

const providers: ProviderRecord[] = [
  provider('vc-1', 'Production vCenter', 'VMWARE', { backingStorageProviderIds: ['fs-1', 'missing-fs', 'vc-2'] }),
  provider('vc-2', 'DR vCenter', 'VMWARE', { role: 'target' }),
  provider('pw-1', 'IBM Power', 'IBM_POWER', { backingStorageProviderIds: ['fs-2'] }),
  provider('fs-1', 'Flash One', 'FLASHCOPY', { partnerProviderId: 'fs-2' }),
  provider('fs-2', 'Flash Two', 'FLASHCOPY', { role: 'target', partnerProviderId: 'fs-1' }),
  provider('fs-3', 'Flash Lab', 'FLASHCOPY', { partnerProviderId: 'fs-4' }),
  provider('fs-4', 'Flash Lab Target', 'FLASHCOPY', { role: 'target' }),
]

function renderContent(overrides: Partial<{ providers: ProviderRecord[]; isLoading: boolean; isError: boolean }> = {}) {
  return render(<ProviderRelationshipsContent providers={overrides.providers ?? providers} isLoading={overrides.isLoading ?? false} isError={overrides.isError ?? false} />)
}

describe('ProviderRelationshipsContent', () => {
  it('explains the model with a short intro and legend', () => {
    renderContent()

    expect(screen.getByRole('heading', { name: 'Provider relationships' })).toBeInTheDocument()
    expect(screen.getByText(/Compute providers run workloads/)).toBeInTheDocument()
    expect(screen.getByText(/replication partner/)).toBeInTheDocument()
    expect(screen.getByText('→ Backing storage →')).toBeInTheDocument()
    expect(screen.getByText('↔ Partner ↔')).toBeInTheDocument()
  })

  // Rows are looked up by the compute provider they start with.
  function computeRow(name: string) {
    const list = screen.getByRole('list', { name: 'Compute providers' })
    const row = within(list).getAllByRole('listitem').find(item => item.firstElementChild?.textContent.startsWith(name))
    if (!row) throw new Error(`No compute row for ${name}`)
    return row
  }

  it('renders one row per compute provider with resolved, unavailable and mismatch targets', () => {
    renderContent()

    expect(within(screen.getByRole('list', { name: 'Compute providers' })).getAllByRole('listitem')).toHaveLength(3)
    const vcenter = computeRow('Production vCenter')
    expect(vcenter).toHaveTextContent('Flash One')
    expect(vcenter).toHaveTextContent('missing-fsUnavailable')
    expect(vcenter).toHaveTextContent('MismatchVMware is not a storage provider')
    expect(computeRow('DR vCenter')).toHaveTextContent('No backing storage provider')
    expect(computeRow('IBM Power')).toHaveTextContent('Flash Two')
  })

  it('shows a mutual partner in full once and as a compact reference afterwards', () => {
    renderContent()
    const vcenter = computeRow('Production vCenter')
    const power = computeRow('IBM Power')

    expect(within(vcenter).getByText('mutual partner')).toHaveClass('sr-only')
    expect(within(vcenter).getAllByText('Flash Two')).toHaveLength(1)
    expect(power).toHaveTextContent('↔ Partner')
    expect(power).toHaveTextContent('Flash Onefs-1')
  })

  it('lists one-way partnerships outside compute rows with their declared direction', () => {
    renderContent()
    const otherList = screen.getByRole('list', { name: 'Other storage relationships' })

    expect(otherList).toHaveTextContent('Flash Lab')
    expect(otherList).toHaveTextContent('Flash Lab Target')
    expect(within(otherList).getByText('partner of')).toHaveClass('sr-only')
    expect(otherList).not.toHaveTextContent('↔')
  })

  it('renders loading, error and empty states', () => {
    const { container, unmount } = renderContent({ isLoading: true })
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    unmount()

    renderContent({ isError: true })
    expect(screen.getByText('Relationships could not be loaded.')).toBeInTheDocument()

    renderContent({ providers: [provider('fs-9', 'Lone storage', 'HITACHI')] })
    expect(screen.getByText('No provider relationships are configured yet.')).toBeInTheDocument()
  })
})
