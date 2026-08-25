import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'
import { useIdentityAdminPreview } from './useIdentityAdminPreview'

function createWrapper(gateway: ReturnType<typeof createMockIdentityAdminGateway>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <IdentityAdminGatewayProvider gateway={gateway}>{children}</IdentityAdminGatewayProvider>
  }
}

describe('useIdentityAdminPreview', () => {
  it('contains rejected mutations and clears the error after a later successful attempt', async () => {
    const gateway = createMockIdentityAdminGateway()
    const { result } = renderHook(() => useIdentityAdminPreview(), {
      wrapper: createWrapper(gateway),
    })

    await waitFor(() => { expect(result.current.data).not.toBeNull() })

    await act(async () => {
      await result.current.mutate(() => Promise.reject(new Error('Save failed')))
    })

    expect(result.current.isMutating).toBe(false)
    expect(result.current.mutationError).toHaveProperty('message', 'Save failed')

    await act(async () => {
      await result.current.mutate(() => Promise.resolve())
    })

    expect(result.current.isMutating).toBe(false)
    expect(result.current.mutationError).toBeNull()
  })

  it('keeps mutation pending until the post-operation preview refresh completes', async () => {
    const gateway = createMockIdentityAdminGateway()
    const originalGetPreview = gateway.getPreview.bind(gateway)
    const initialPreview = await originalGetPreview()
    let resolveRefresh: ((value: typeof initialPreview) => void) | undefined
    const refreshPromise = new Promise<typeof initialPreview>(resolve => { resolveRefresh = resolve })
    const getPreview = vi.spyOn(gateway, 'getPreview')
      .mockResolvedValueOnce(initialPreview)
      .mockImplementationOnce(() => refreshPromise)

    const { result } = renderHook(() => useIdentityAdminPreview(), {
      wrapper: createWrapper(gateway),
    })
    await waitFor(() => { expect(result.current.data).not.toBeNull() })

    let mutationPromise: Promise<void> | undefined
    act(() => {
      mutationPromise = result.current.mutate(() => Promise.resolve())
    })

    await waitFor(() => { expect(result.current.isMutating).toBe(true) })
    expect(getPreview).toHaveBeenCalledTimes(2)

    resolveRefresh?.(initialPreview)
    await act(async () => { await mutationPromise })

    expect(result.current.isMutating).toBe(false)
    expect(result.current.mutationError).toBeNull()
  })
})
