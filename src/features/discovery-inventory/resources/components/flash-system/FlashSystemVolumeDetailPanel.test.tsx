import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashSystemVolumeDetailPanel } from './FlashSystemVolumeDetailPanel'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const volume = {
  id: '1',
  name: 'V5000_VOLUME02',
  pool: null,
  resolvedConsistencyGroups: [],
} as unknown as FlashSystemVolumeResource

const labels = {
  entity: 'FlashSystem volume',
  detail: 'Volume detail',
  close: 'Close volume',
  resize: 'Resize',
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
  fieldLabels: {},
}

describe('FlashSystemVolumeDetailPanel', () => {
  it('lays out accented sections that scroll on their own', () => {
    render(<FlashSystemVolumeDetailPanel volume={volume} open onClose={vi.fn()} labels={labels} />)
    const accentOf = (name: string) => screen.getByRole('button', { name }).closest('section')?.getAttribute('data-accent')

    expect(screen.getByRole('dialog').querySelector('[data-body-layout]')).toHaveAttribute('data-body-layout', 'sections')
    expect(accentOf('Identity')).toBe('overview')
    expect(accentOf('Placement and capacity')).toBe('storage')
    expect(accentOf('State and behavior')).toBe('configuration')
    expect(accentOf('Copy relationships')).toBe('protection')
    expect(accentOf('Pool')).toBe('storage')
  })
})
