import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRecoveryGroupInventory } from '../api/recoveryGroupsApi'
import { useRecoveryGroupInventory } from './useRecoveryGroups'

vi.mock('../api/recoveryGroupsApi', () => ({
  fetchRecoveryGroupInventory: vi.fn(),
}))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({ useProviders: vi.fn() }))

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

describe('useRecoveryGroupInventory', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('loads only when the inventory tab is active and a run ID exists', async () => {
    vi.mocked(fetchRecoveryGroupInventory).mockResolvedValue({ recovery_group_id: 'group', recovery_group_name: 'Group', run_id: 'run-2', volumes: {} })
    const { rerender } = renderHook(({ active, runId }) => useRecoveryGroupInventory(runId, active), {
      wrapper,
      initialProps: { active: false, runId: 'run-2' },
    })
    expect(fetchRecoveryGroupInventory).not.toHaveBeenCalled()
    rerender({ active: true, runId: 'run-2' })
    await waitFor(() => { expect(fetchRecoveryGroupInventory).toHaveBeenCalledWith('run-2') })
  })
})
