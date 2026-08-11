import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import { flashSystemInventoryResponseSchema } from '../../../api/schemas/flashSystemInventorySchema'
import { mapFlashSystemInventory } from '../../../helpers/mapFlashSystemInventory'
import { FlashSystemInventoryView } from './FlashSystemInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const provider: ProviderRecord = {
  id: 'flash-01',
  name: 'Flash 01',
  description: '',
  type: 'FLASHCOPY',
  ipAddress: '10.0.0.1',
  port: 22,
  credentialId: null,
  credentialStatus: 'none',
}

const secondProvider: ProviderRecord = {
  ...provider,
  id: 'flash-02',
  name: 'Flash 02',
}

describe('FlashSystemInventoryView', () => {
  it('renders relevant columns and localized detail relationships', () => {
    const inventory = mapFlashSystemInventory(flashSystemInventoryResponseSchema.parse({
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
    expect(screen.getByRole('columnheader', { name: 'Copies' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'FlashCopy maps' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'I/O group' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Protocol' })).not.toBeInTheDocument()
    const hostBadge = screen.getByRole('button', { name: 'Show details for host HOST_esx' })
    fireEvent.click(hostBadge)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('row', { name: 'Show details for V5000_Volume1' }))
    const dialog = screen.getByRole('dialog', { name: 'FlashSystem volume detail' })
    expect(within(dialog).getByText('Placement and capacity')).toBeInTheDocument()
    expect(within(dialog).getByText('Virtual disk UID')).toBeInTheDocument()
    expect(within(dialog).getByText('Protocol')).toBeInTheDocument()
    expect(within(dialog).getByText('scsi')).toBeInTheDocument()
    expect(within(dialog).getByText('6.98 TB')).toBeInTheDocument()
    expect(within(dialog).getByText('898 GB')).toBeInTheDocument()
    expect(within(dialog).queryByText('Status')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Type')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Pool name')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Copy count')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('FlashCopy map count')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Host mappings')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('SCSI ID')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Provider')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('online')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('striped')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('HOST_esx')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('flash-01')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('3 TB')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Pool0')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('mdisk_grp_id')).not.toBeInTheDocument()
  })

  it('does not render a duplicate provider filter for the selected source tab', () => {
    const { t } = useTranslation()
    const inventory = mapFlashSystemInventory(flashSystemInventoryResponseSchema.parse({
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
})
