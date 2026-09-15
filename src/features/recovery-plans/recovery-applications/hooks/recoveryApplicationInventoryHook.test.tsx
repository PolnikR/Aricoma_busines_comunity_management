import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRecoveryApplicationInventory } from '../api/recoveryApplicationsApi'
import { useRecoveryApplicationInventory } from './useRecoveryApplications'

vi.mock('../api/recoveryApplicationsApi', () => ({
  fetchRecoveryApplications: vi.fn(),
  fetchRecoveryApplicationInventory: vi.fn(),
  submitRecoveryApplicationDag: vi.fn(),
}))

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

describe('useRecoveryApplicationInventory', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('loads only when the inventory tab is active and a run ID exists', async () => {
    vi.mocked(fetchRecoveryApplicationInventory).mockResolvedValue({ recovery_app_id: 'app', recovery_app_name: 'App', run_id: 'run-1', tiers: [] })
    const { rerender } = renderHook(({ active, runId }) => useRecoveryApplicationInventory(runId, active), {
      wrapper,
      initialProps: { active: false, runId: 'run-1' },
    })
    expect(fetchRecoveryApplicationInventory).not.toHaveBeenCalled()
    rerender({ active: true, runId: 'run-1' })
    await waitFor(() => { expect(fetchRecoveryApplicationInventory).toHaveBeenCalledWith('run-1') })
  })
})
