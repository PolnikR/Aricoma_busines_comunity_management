import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import { VolumesResponse } from '@/generated/query/zod'
import { parseWireResponse } from '@/test-utils/parseWireResponse'
import { mapFlashSystemInventory } from '../../helpers/mapFlashSystemInventory'
import { FlashSystemInventoryView } from './FlashSystemInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const provider: ProviderRecord = {
  id: 'flash-01',
  name: 'Flash 01',
  description: '',
  type: 'FLASHCOPY',
  role: 'source',
  ipAddress: '10.0.0.1',
  credentialId: null,
  credentialStatus: 'none',
}

const secondProvider: ProviderRecord = {
  ...provider,
  id: 'flash-02',
  name: 'Flash 02',
}

// The detail shows one section at a time: visit every section and collect its text.
function allSectionText(dialog: HTMLElement) {
  const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })
  return within(navigation).getAllByRole('button').map((button) => {
    fireEvent.click(button)
    return within(dialog).getByRole('region').textContent
  }).join(' | ')
}

function openCopyRelationships(dialog: HTMLElement) {
  fireEvent.click(within(within(dialog).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name: 'Copy relationships' }))
}

describe('FlashSystemInventoryView', () => {
  it('renders relevant columns and localized detail relationships', () => {
    const inventory = mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
      count: 1,
      volumes: [{
        id: '0',
        name: 'V5000_Volume1',
        status: 'online',
        capacity: '3 TB',
        type: 'striped',
        protocol: 'scsi',
        vdisk_UID: 'uid-1',
        mdisk_grp_id: '0',
        mdisk_grp_name: 'Pool0',
        host_maps: [{ host_id: '0', scsi_id: '1' }],
      }],
      pools: {
        0: {
          name: 'Pool0',
          capacity: '6.98 TB',
          used_capacity: '6.02 TB',
          free_capacity: '898 GB',
        },
      },
      hosts: {
        0: { name: 'HOST_esx', cluster_id: null, cluster_name: '' },
      },
      clusters: {},
      consistency_groups: {},
    }), provider.id)
    const { t } = useTranslation()

    render(<MemoryRouter><FlashSystemInventoryView
      resources={inventory.resources}
      providers={[provider]}
      t={t}
    /></MemoryRouter>)
    expect(screen.getByRole('columnheader', { name: 'Capacity' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pool' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Mapped hosts' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Copies' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FlashCopy maps' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show details for host HOST_esx' }).closest('td')).toHaveClass('w-[19%]')
    expect(screen.getByText('flash-01').closest('td')).toHaveClass('w-[15%]')
    expect(screen.queryByRole('columnheader', { name: 'I/O group' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Protocol' })).not.toBeInTheDocument()
    const hostBadge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    fireEvent.click(hostBadge)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('row', { name: 'Show details for V5000_Volume1' }))
    const dialog = screen.getByRole('dialog', { name: 'FlashSystem volume detail' })
    expect(within(dialog).getByRole('button', { name: 'Identity' })).toHaveAttribute('aria-current', 'true')
    expect(within(dialog).getByRole('button', { name: 'Copy relationships' })).not.toHaveAttribute('aria-current')
    fireEvent.click(within(dialog).getByRole('button', { name: 'FlashSystem volume help' }))
    expect(screen.getByRole('dialog', { name: 'What this volume view shows' })).toHaveTextContent('Remote Copy')
    fireEvent.click(screen.getByRole('button', { name: 'Close help' }))
    const text = allSectionText(dialog)
    for (const shown of ['Placement and capacity', 'Virtual disk UID', 'Protocol', 'scsi', '6.98 TB', '898 GB']) {
      expect(text).toContain(shown)
    }
    for (const hidden of ['Status', 'Type', 'Pool name', 'Copy count', 'FlashCopy map count', 'Host mappings', 'SCSI ID', 'Provider', 'online', 'striped', 'HOST_esx', 'flash-01', '3 TB', 'Pool0', 'mdisk_grp_id']) {
      expect(text).not.toContain(hidden)
    }
  })

  it('does not render a duplicate provider filter for the selected source tab', () => {
    const { t } = useTranslation()
    const inventory = mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
      count: 1,
      volumes: [{
        id: '0',
        name: 'V5000_Volume1',
        status: 'online',
        capacity: '3 TB',
        type: 'striped',
        vdisk_UID: 'uid-1',
      }],
      pools: {},
      hosts: {},
      clusters: {},
      consistency_groups: {},
    }), provider.id)

    render(<MemoryRouter><FlashSystemInventoryView
      resources={inventory.resources}
      providers={[provider, secondProvider]}
      t={t}
    /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Pool')).toBeInTheDocument()
  })

  it('closes the detail drawer when the selected volume is no longer in the provider dataset', async () => {
    const { t } = useTranslation()
    const inventory = mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
      count: 1,
      volumes: [{
        id: '0',
        name: 'V5000_Volume1',
        status: 'online',
        capacity: '3 TB',
        type: 'striped',
        vdisk_UID: 'uid-1',
      }],
      pools: {},
      hosts: {},
      clusters: {},
      consistency_groups: {},
    }), provider.id)
    const view = render(<MemoryRouter><FlashSystemInventoryView resources={inventory.resources} providers={[provider]} t={t} /></MemoryRouter>)

    fireEvent.click(screen.getByRole('row', { name: 'Show details for V5000_Volume1' }))
    expect(screen.getByRole('dialog', { name: 'FlashSystem volume detail' })).toBeInTheDocument()

    view.rerender(<MemoryRouter><FlashSystemInventoryView resources={[]} providers={[provider]} t={t} /></MemoryRouter>)

    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'FlashSystem volume detail' })).not.toBeInTheDocument() })
  })

  it('draws the volume relationships in the help from allProviders while providers keeps the FlashSystem context', () => {
    const { t } = useTranslation()
    const partner: ProviderRecord = { ...provider, id: 'flash-dr', name: 'Flash DR', role: 'target', partnerProviderId: 'flash-01' }
    const sourceWithPartner: ProviderRecord = { ...provider, partnerProviderId: 'flash-dr' }
    const inventory = mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
      count: 1,
      volumes: [{ id: '0', name: 'vol0', mdisk_grp_id: '0', host_maps: [{ host_id: '3', scsi_id: '1' }], RC_id: '', FC_id: '' }],
      pools: { '0': { name: 'Pool0', capacity: '6.98TB' } },
      hosts: { '3': { name: 'esx-01', cluster_name: 'ESX_CLUSTER' } },
      clusters: {},
      consistency_groups: {},
    }), provider.id)

    render(<MemoryRouter><FlashSystemInventoryView resources={inventory.resources} providers={[provider]} allProviders={[sourceWithPartner, partner]} t={t} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('row', { name: 'Show details for vol0' }))
    const dialog = screen.getByRole('dialog', { name: 'FlashSystem volume detail' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'FlashSystem volume help' }))
    const help = screen.getByRole('dialog', { name: 'What this volume view shows' })

    expect(within(help).getByRole('list', { name: 'Placement' })).toHaveTextContent(/Flash 01.*Pool0.*vol0/)
    expect(within(help).getByRole('list', { name: 'Host mappings' })).toHaveTextContent(/esx-01.*ESX_CLUSTER.*SCSI ID 1/)
    expect(within(help).getByRole('list', { name: 'Copy relationships' })).toHaveTextContent('No FlashCopy or Remote Copy relationship is reported for this volume.')
    expect(within(help).getByRole('list', { name: 'Provider partnership (configured)' })).toHaveTextContent('Flash DR')
    expect(help).toHaveTextContent('It does not show that this volume is replicated.')
    // The view's own provider list is untouched: the filter still offers only its FlashSystem.
    expect(screen.queryByRole('option', { name: 'Flash DR' })).not.toBeInTheDocument()
  })

  it('shows consistency groups from get_volumes between FlashCopy and Remote Copy fields without fetching', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { t } = useTranslation()
    const inventory = mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
      count: 3,
      volumes: [
        {
          id: '0', name: 'multi', FC_id: 'many', FC_name: 'many', RC_id: '7', RC_name: 'rcrel0', RC_change: 'no',
          consistency_group_ids: ['5', '6'],
        },
        { id: '1', name: 'single', consistency_group_ids: ['5'] },
        { id: '2', name: 'ungrouped' },
      ],
      pools: {},
      hosts: {},
      clusters: {},
      consistency_groups: {
        '5': { name: 'cg_daily', status: 'copying' },
        '6': { name: 'cg_weekly', status: 'idle_or_copied' },
      },
    }), provider.id)

    render(<MemoryRouter><FlashSystemInventoryView resources={inventory.resources} providers={[provider]} t={t} /></MemoryRouter>)

    const consistencyRow = () => within(screen.getByRole('dialog', { name: 'FlashSystem volume detail' }))
      .getByText('Consistency groups').closest('div') as HTMLElement

    fireEvent.click(screen.getByRole('row', { name: 'Show details for multi' }))
    const dialog = screen.getByRole('dialog', { name: 'FlashSystem volume detail' })
    openCopyRelationships(dialog)
    const copyLabels = within(within(dialog).getByRole('region', { name: 'Copy relationships' })).getAllByRole('term')
    expect([...copyLabels].map((label) => label.textContent)).toEqual([
      'FlashCopy ID', 'FlashCopy name', 'Consistency groups', 'Remote Copy ID', 'Remote Copy name',
      'Space-efficient copy count', 'Compressed copy count', 'Remote Copy change',
    ])
    expect(within(consistencyRow()).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'cg_dailycopying', 'cg_weeklyidle_or_copied',
    ])
    expect(within(dialog).getAllByText('many')).toHaveLength(2)
    expect(within(dialog).getByText('rcrel0')).toBeInTheDocument()
    expect(within(dialog).getByText('no')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('row', { name: 'Show details for single' }))
    openCopyRelationships(screen.getByRole('dialog', { name: 'FlashSystem volume detail' }))
    expect(within(consistencyRow()).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['cg_dailycopying'])

    fireEvent.click(screen.getByRole('row', { name: 'Show details for ungrouped' }))
    openCopyRelationships(screen.getByRole('dialog', { name: 'FlashSystem volume detail' }))
    expect(within(consistencyRow()).queryByRole('listitem')).not.toBeInTheDocument()
    expect(within(consistencyRow()).getByText('Not set')).toBeInTheDocument()

    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
