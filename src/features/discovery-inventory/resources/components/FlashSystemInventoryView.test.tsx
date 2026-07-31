import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import { flashSystemInventoryResponseSchema } from '../../api/schemas/flashSystemInventorySchema'
import { mapFlashSystemInventory } from '../../helpers/mapFlashSystemInventory'
import { FlashSystemInventoryView } from './FlashSystemInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const provider: ProviderRecord = {
  id: 'flash-01',
  name: 'Flash 01',
  description: '',
  type: 'FLASHCOPY',
  ipAddress: '10.0.0.1',
  credentialId: null,
  credentialStatus: 'none',
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

    render(<FlashSystemInventoryView resources={inventory.resources} providers={[provider]} t={t} />)
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
    expect(within(dialog).getByText('SCSI ID')).toBeInTheDocument()
    expect(within(dialog).getByText('898 GB')).toBeInTheDocument()
    expect(within(dialog).queryByText('mdisk_grp_id')).not.toBeInTheDocument()
  })
})
