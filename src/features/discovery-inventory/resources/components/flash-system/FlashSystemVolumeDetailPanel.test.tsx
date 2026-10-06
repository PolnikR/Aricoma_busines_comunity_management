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
  technical: 'Technical',
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
  it('opens on Placement with the business sections first and Technical last', () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })

    expect(dialog).toHaveAttribute('data-size', 'lg')
    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual([
      'Placement and capacity', 'State and behavior', 'Copy relationships', 'Pool', 'Technical',
    ])
    expect(within(navigation).getByRole('button', { name: 'Placement and capacity' })).toHaveAttribute('aria-current', 'true')
  })

  it('lists the volume identifiers with copy actions in Technical', async () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Technical' }))
    const technical = within(dialog).getByRole('region', { name: 'Technical' })

    expect(within(technical).getByRole('heading', { name: 'Identity' })).toBeInTheDocument()
    expect(within(technical).getByText('Virtual disk UID').nextElementSibling).toHaveTextContent('600507638082007A48000000000000A1')
    expect(within(technical).getByRole('button', { name: 'Copy Volume ID' })).toBeInTheDocument()
  })

  it('shows the pool capacity in the Pool section', async () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const dialog = screen.getByRole('dialog', { name: 'Volume detail' })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Pool' }))

    expect(within(dialog).getByRole('region', { name: 'Pool' })).toHaveTextContent(/Capacity6.98 TBUsed capacity6.02 TBFree capacity898 GB/)
  })
})
