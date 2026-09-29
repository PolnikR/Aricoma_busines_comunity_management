import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRecoveryApplicationInventory } from '../hooks/useRecoveryApplications'
import { RecoveryApplicationInventory } from './RecoveryApplicationInventory'

vi.mock('../hooks/useRecoveryApplications', () => ({ useRecoveryApplicationInventory: vi.fn() }))
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

describe('RecoveryApplicationInventory', () => {
  it('renders summary metrics and compact tier disclosures with VM rows', () => {
    vi.mocked(useRecoveryApplicationInventory).mockReturnValue({
      data: { recovery_app_id: 'app-1', recovery_app_name: 'Finance', run_id: 'run-1', compute_provider_id: 'vcenter-2', recovered_datastores: [{ datastore: 'recovered-ds', target_vdisk: 'DR_VOL01', vms: ['db-01'] }], tiers: [{ tier_name: 'Database', recovery_group_id: 'group-1', recovery_group_name: 'DB group', vms: [{ name: 'db-01', found: true, datastores: ['recovered-ds'] }] }] },
      isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRecoveryApplicationInventory>)

    render(<RecoveryApplicationInventory runId="run-1" active />)
    expect(screen.getByText('recoveryInventory.tiers')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.virtualMachines')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('db-01')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.recoveredDatastores')).toBeInTheDocument()
    expect(screen.getByText(/DR_VOL01/)).toBeInTheDocument()
    expect(screen.getAllByText(/recovered-ds/)).toHaveLength(3)
    expect(screen.getByLabelText('recoveryInventory.showTechnicalJson')).toBeInTheDocument()
    expect(document.querySelectorAll('details')).toHaveLength(2)
  })
})
