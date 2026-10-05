import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { SelectedProviderRelationships } from './SelectedProviderRelationships'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

function provider(id: string, name: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name, type, role: 'source', credentialStatus: 'ok', ...extra }
}

const providers = [
  provider('vc-1', 'Production vCenter', 'VMWARE', { backingStorageProviderIds: ['flash-1', 'gone-1'] }),
  provider('vc-2', 'Branch vCenter', 'VMWARE', { backingStorageProviderIds: ['flash-1'] }),
  provider('vc-9', 'Unrelated vCenter', 'VMWARE', { backingStorageProviderIds: ['flash-9'] }),
  provider('flash-1', 'Flash Source 01', 'FLASHCOPY', { partnerProviderId: 'flash-2' }),
  provider('flash-2', 'Flash Target 02', 'FLASHCOPY', { partnerProviderId: 'flash-1', role: 'target' }),
  provider('flash-9', 'Unrelated Flash', 'FLASHCOPY'),
  provider('hitachi-1', 'Hitachi VSP', 'HITACHI'),
  provider('flash-3', 'Lone Flash', 'FLASHCOPY'),
]

function renderFor(selectedProviderId: string, state: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
  render(
    <SelectedProviderRelationships
      allProviders={providers}
      selectedProviderId={selectedProviderId}
      isLoading={state.isLoading ?? false}
      isError={state.isError ?? false}
    />,
  )
}

const card = (name: string) => screen.getAllByRole('group', { name })

describe('SelectedProviderRelationships', () => {
  it('shows only the selected compute provider neighbourhood, with storage, partner and problem cards', () => {
    renderFor('vc-1')
    const list = screen.getByRole('list', { name: 'Backing storage of this provider' })

    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(card('Production vCenter')[0]).toHaveTextContent('Selected')
    expect(card('Flash Source 01')[0]).toHaveTextContent('FlashCopy')
    expect(card('Flash Target 02')[0]).toHaveTextContent('Target')
    expect(card('gone-1')[0]).toHaveTextContent('UnavailableNot in the current provider list')
    expect(screen.queryByText('Unrelated vCenter')).not.toBeInTheDocument()
    expect(screen.queryByText('Unrelated Flash')).not.toBeInTheDocument()
    expect(screen.queryByText('Branch vCenter')).not.toBeInTheDocument()
    expect(screen.queryByText(/Other storage relationships/)).not.toBeInTheDocument()
  })

  it('draws backing, mutual partner and problem connectors and describes each card', () => {
    renderFor('vc-1')
    const kinds = [...document.querySelectorAll('[data-edge-kind]')].map(edge => [edge.getAttribute('data-edge-kind'), edge.getAttribute('data-direction')])

    expect(kinds).toEqual([['backing', 'forward'], ['partner', 'both'], ['problem', 'forward']])
    expect(card('Flash Source 01')[0]).toHaveAccessibleDescription('used as backing storage by Production vCenter, mutual partner Flash Target 02')
    expect(card('Production vCenter')[0]).toHaveAccessibleDescription('backing storage Flash Source 01, invalid backing storage reference gone-1')
  })

  it('shows the compute providers using a selected FlashSystem and its partner in every row', () => {
    renderFor('flash-1')
    const rows = within(screen.getByRole('list', { name: 'Compute providers using this storage' })).getAllByRole('listitem')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent(/Production vCenter.*Flash Source 01.*Flash Target 02/)
    expect(rows[1]).toHaveTextContent(/Branch vCenter.*Flash Source 01.*Flash Target 02/)
    expect(screen.queryByText('Unrelated Flash')).not.toBeInTheDocument()
  })

  it('shows a Hitachi provider without a partner lane', () => {
    renderFor('hitachi-1')

    expect(screen.getByText('Not used as backing storage')).toBeInTheDocument()
    expect(screen.queryByText('No partner configured')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-edge-kind]')).toHaveLength(0)
  })

  it('keeps the selected provider visible with a neutral empty state', () => {
    renderFor('flash-3')

    expect(card('Lone Flash')[0]).toHaveTextContent('Selected')
    expect(screen.getByText('Not used as backing storage')).toBeInTheDocument()
    expect(screen.getByText('No partner configured')).toBeInTheDocument()
  })

  it('highlights the hovered card and its direct neighbours only', () => {
    renderFor('vc-1')
    const [vcenter] = card('Production vCenter')
    if (!vcenter) throw new Error('selected card not rendered')

    fireEvent.pointerEnter(vcenter)

    expect(card('Flash Source 01')[0]).toHaveAttribute('data-highlight', 'on')
    expect(card('Flash Target 02')[0]).toHaveAttribute('data-highlight', 'off')
  })

  it('shows loading, error and missing states', () => {
    renderFor('vc-1', { isLoading: true })
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    cleanup()

    renderFor('vc-1', { isError: true })
    expect(screen.getByText('Relationships could not be loaded.')).toBeInTheDocument()
    cleanup()

    renderFor('nope')
    expect(screen.getByText('This provider is not in the current provider list.')).toBeInTheDocument()
  })
})
