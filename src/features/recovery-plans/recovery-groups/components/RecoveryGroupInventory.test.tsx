import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRecoveryGroupInventory } from '../hooks/useRecoveryGroups'
import { RecoveryGroupInventory } from './RecoveryGroupInventory'

vi.mock('../hooks/useRecoveryGroups', () => ({ useRecoveryGroupInventory: vi.fn() }))
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

describe('RecoveryGroupInventory', () => {
  it('renders summary metrics and compact source-to-target volume disclosures', () => {
    vi.mocked(useRecoveryGroupInventory).mockReturnValue({
      data: { recovery_group_id: 'group-1', recovery_group_name: 'Database', run_id: 'run-2', provider_id_volume: 'flash-1', volumes: { 'volume-1': { found: true, relations: [{ role: 'target', mapping: { id: 'map-1' }, paired_volume: { name: 'source-1' } }] } } },
      isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRecoveryGroupInventory>)

    render(<RecoveryGroupInventory runId="run-2" active />)
    expect(screen.getByText('recoveryInventory.volumes')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.relations')).toBeInTheDocument()
    expect(screen.getAllByText('volume-1')).toHaveLength(2)
    expect(screen.getByText('source-1')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.sourceVolume')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.targetVolume')).toBeInTheDocument()
    expect(screen.getByLabelText('recoveryInventory.showTechnicalJson')).toBeInTheDocument()
    expect(document.querySelectorAll('details')).toHaveLength(2)
  })
})
