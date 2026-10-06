import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashSystemVolumeDetailPanel } from './FlashSystemVolumeDetailPanel'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const volume = {
  id: '1',
  name: 'V5000_VOLUME02',
  volume_id: '17',
  vdisk_UID: '600507638082007A48000000000000A1',
  pool: { capacity: '6.98 TB', used_capacity: '6.02 TB', free_capacity: '898 GB' },
  resolvedConsistencyGroups: [],
} as unknown as FlashSystemVolumeResource

const labels = {
  entity: 'FlashSystem volume',
  detail: 'Volume detail',
  close: 'Close volume',
  pool: 'Pool',
  capacity: 'Capacity',
  usedCapacity: 'Used capacity',
  freeCapacity: 'Free capacity',
  consistencyGroups: 'Consistency groups',
  groups: {
    identity: 'Identity',
    placement: 'Placement and capacity',
    state: 'State and behavior',
    copies: 'Copy relationships',
  },
  fieldLabels: { id: 'ID', volume_id: 'Volume ID', vdisk_UID: 'Virtual disk UID' },
}

describe('FlashSystemVolumeDetailPanel', () => {
  it('opens on Identity with the original sections and no Technical section', () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })

    expect(dialog).toHaveAttribute('data-size', 'lg')
    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual([
      'Identity', 'Placement and capacity', 'State and behavior', 'Copy relationships', 'Pool',
    ])
    expect(within(navigation).getByRole('button', { name: 'Identity' })).toHaveAttribute('aria-current', 'true')
    expect(within(navigation).queryByRole('button', { name: 'Technical' })).not.toBeInTheDocument()
  })

  it('lists ID, Volume ID and Virtual disk UID in Identity with copy actions', () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const identity = within(screen.getByRole('dialog', { name: 'Volume detail' })).getByRole('region', { name: 'Identity' })

    expect([...identity.querySelectorAll('dt')].map(term => term.textContent)).toEqual(['ID', 'Volume ID', 'Virtual disk UID'])
    expect(within(identity).getByText('Virtual disk UID').nextElementSibling).toHaveTextContent('600507638082007A48000000000000A1')
    expect(within(identity).getByText('600507638082007A48000000000000A1')).toHaveClass('font-mono')
    expect(within(identity).getByRole('button', { name: 'Copy Volume ID' })).toBeInTheDocument()
  })

  it('keeps the consistency groups in Copy relationships', async () => {
    const withGroups = { ...volume, resolvedConsistencyGroups: [{ id: 'cg-1', name: 'CG_SAP', status: 'consistent_synchronized' }] }
    render(<FlashSystemVolumeDetailPanel volume={withGroups} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Copy relationships' }))

    const copies = within(dialog).getByRole('region', { name: 'Copy relationships' })
    expect(within(copies).getByText('Consistency groups').nextElementSibling).toHaveTextContent(/CG_SAP.*consistent_synchronized/)
  })

  it('shows the pool capacity in the Pool section', async () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Pool' }))

    expect(within(dialog).getByRole('region', { name: 'Pool' })).toHaveTextContent(/Capacity6.98 TBUsed capacity6.02 TBFree capacity898 GB/)
  })
})
