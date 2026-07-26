import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { VMSidebar } from './VMSidebar'
import type { DiscoveryInventory } from '@/features/discovery-inventory/model/discoveryTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: vi.fn(),
}))

const inventory: DiscoveryInventory = {
  reportedCount: 3,
  virtualMachines: [
    { name: 'WEB-02' },
    { name: 'DB-01' },
    { name: 'WEB-02' },
  ] as DiscoveryInventory['virtualMachines'],
}

function mockQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useDiscoveryInventory).mockReturnValue({
    data: inventory,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useDiscoveryInventory>)
}

beforeEach(() => {
  mockQuery()
})

describe('VMSidebar', () => {
  it('deduplicates, sorts, and filters discovered VM names', async () => {
    const user = userEvent.setup()
    render(<VMSidebar />)

    const vmNames = screen.getAllByText(/^(DB-01|WEB-02)$/).map((node) => node.textContent)
    expect(vmNames).toEqual(['DB-01', 'WEB-02'])

    await user.type(screen.getByPlaceholderText('Search VMs...'), 'web')
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
    expect(screen.getByText('WEB-02')).toBeInTheDocument()
  })

  it('supports dragging a VM and reports selection', () => {
    const onVMSelect = vi.fn()
    const setData = vi.fn()
    render(<VMSidebar onVMSelect={onVMSelect} />)

    fireEvent.dragStart(screen.getByText('DB-01'), {
      dataTransfer: { setData },
    })

    expect(setData).toHaveBeenCalledWith('vm-name', 'DB-01')
    expect(onVMSelect).toHaveBeenCalledWith('DB-01')
  })

  it('renders a retryable initial error', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    mockQuery({ data: undefined, error: new Error('offline'), refetch })
    render(<VMSidebar />)

    expect(screen.getByText('offline')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
