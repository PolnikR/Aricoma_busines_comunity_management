import type { PropsWithChildren } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { invalidateProviderMutation } from '@/shared/query/providerMutationInvalidation'
import { useRecoveryGroupResourceInventory } from '@/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory'
import { ResourcesPage } from '../../pages/ResourcesPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

let client: QueryClient
let finishOld: (value: Response) => void
let pending: Promise<Response>
let current: boolean
let filtered: boolean
const providers = [{ id: 'a', name: 'A', type: 'VMWARE', role: 'source', credentialStatus: 'ok' }]
const inventory = (name: string, memory = 7) => Response.json({ count: 1, vms: [{ name, provider_id: 'a', memory_gb: memory, vcpu: 3 }] })

function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: 900_000, retry: false } } })
  window.sessionStorage.clear()
  current = false
  filtered = false
  pending = new Promise<Response>(resolve => { finishOld = resolve })
  vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
    if (url.includes('/get_providers')) return Promise.resolve(Response.json({ providers }))
    if (url.includes('/tags')) return Promise.resolve(Response.json({ tags: [] }))
    if (url.includes('/vms/search')) {
      if (current) return Promise.resolve(inventory('Current VM', 11))
      if (init.body !== '{}') { filtered = true; return pending }
      return Promise.resolve(inventory('Old VM'))
    }
    throw new Error(`Unexpected request: ${url}`)
  }))
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals() })

describe('deleted VMware inventory in real consumers', () => {
  it('removes placeholder rows and stale metrics from Resources while the provider list still contains A', async () => {
    render(<ResourcesPage />, { wrapper: Wrapper })
    expect(await screen.findByText('Old VM')).toBeVisible()
    expect(screen.getByText('7 GB')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search virtual machines' }), { target: { value: 'Current' } })
    await waitFor(() => { expect(filtered).toBe(true) })
    // The real table uses skeleton rows during the placeholder fetch, while
    // metrics still read the retained inventory.
    expect(screen.getByText('7 GB')).toBeVisible()
    await act(async () => {
      await invalidateProviderMutation(client, ['deleteProvider'], { params: { provider_id: 'a' } })
    })
    expect(screen.queryByText('Old VM')).not.toBeInTheDocument()
    expect(screen.queryByText('7 GB')).not.toBeInTheDocument()
    current = true
    await act(async () => {
      await invalidateProviderMutation(client, ['submitProvider'], { data: { id: 'a' } })
    })
    expect(await screen.findByText('Current VM')).toBeVisible()
    expect(screen.getByText('11 GB')).toBeVisible()
    await act(async () => { finishOld(inventory('Stale VM')); await pending })
    expect(screen.queryByText('Stale VM')).not.toBeInTheDocument()
  })

  it('removes retained Recovery Group resource names and metadata and recovers in place', async () => {
    const hook = renderHook(({ prefix }) => useRecoveryGroupResourceInventory('vmware_virtual_machines', 'a', { providerScope: null, vmwareNamePrefix: prefix }), { wrapper: Wrapper, initialProps: { prefix: '' } })
    await waitFor(() => { expect(hook.result.current.data?.resourceNames).toEqual(['Old VM']) })
    expect(hook.result.current.data?.vmMetadataByName['Old VM']).toMatchObject({ memory_gb: 7 })
    hook.rerender({ prefix: 'Current' })
    await waitFor(() => { expect(filtered).toBe(true) })
    expect(hook.result.current.isPlaceholderData).toBe(true)
    await act(async () => {
      await invalidateProviderMutation(client, ['deleteProvider'], { params: { provider_id: 'a' } })
    })
    expect(hook.result.current.data).toBeUndefined()
    expect(hook.result.current).toMatchObject({ isEmpty: false })
    current = true
    await act(async () => {
      await invalidateProviderMutation(client, ['submitProvider'], { data: { id: 'a' } })
    })
    await waitFor(() => { expect(hook.result.current.data?.resourceNames).toEqual(['Current VM']) })
    await act(async () => { finishOld(inventory('Stale VM')); await pending })
    expect(hook.result.current.data?.vmMetadataByName['Old VM']).toBeUndefined()
    expect(hook.result.current.data?.vmMetadataByName['Stale VM']).toBeUndefined()
  })
})
