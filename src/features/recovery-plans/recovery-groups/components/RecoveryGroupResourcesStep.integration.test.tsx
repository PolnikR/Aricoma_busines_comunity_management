import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import {
  createDiscoveryFetchHandlers,
  installDiscoveryFetch,
} from '@/features/discovery-inventory/resources/test/discoveryFetch'
import type { RecoveryGroupProviderScope } from '../model/recoveryGroupTypes'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const discoveryFetch = createDiscoveryFetchHandlers()
const { fetchVmwareInventory } = discoveryFetch

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function step(providerId: string, providerScope: RecoveryGroupProviderScope | null) {
  return (
    <RecoveryGroupResourcesStep
      workloadType="vmware_virtual_machines"
      providerId={providerId}
      providerScope={providerScope}
      resources={[]}
      onAdd={vi.fn()}
      onRemove={vi.fn()}
    />
  )
}

const searchbox = () => screen.getByRole('searchbox', { name: 'Search virtual machines' })
// Longer than the 300 ms name search debounce, so any delayed request has been sent.
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 400)) })
const searches = () => fetchVmwareInventory.mock.calls.map(([search]) => search)

describe('RecoveryGroupResourcesStep VMware search lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installDiscoveryFetch(discoveryFetch)
    fetchVmwareInventory.mockReturnValue({ count: 1, vms: [{ name: 'VM-01' }] })
  })

  async function searchOnServer(providerId: string) {
    await userEvent.setup().type(searchbox(), 'PROD-')
    await waitFor(() => { expect(searches()).toContainEqual({ providerId, namePrefix: 'PROD-' }) }, { timeout: 1_000 })
  }

  it('does not send the previous provider search to a newly selected provider', async () => {
    const { rerender } = render(step('vmware-a', null), { wrapper: createWrapper() })
    await screen.findByText('VM-01')
    await searchOnServer('vmware-a')

    rerender(step('vmware-b', null))
    await settle()

    expect(searches()).toContainEqual({ providerId: 'vmware-b' })
    expect(searches()).not.toContainEqual({ providerId: 'vmware-b', namePrefix: 'PROD-' })
    expect(searchbox()).toHaveValue('')
  })

  it('drops the server search when the same provider gains a fixed scope', async () => {
    const { rerender } = render(step('vmware-a', null), { wrapper: createWrapper() })
    await screen.findByText('VM-01')
    await searchOnServer('vmware-a')
    const callsBeforeSwitch = fetchVmwareInventory.mock.calls.length

    rerender(step('vmware-a', { vmPrefix: 'TEST-', vmTags: [] }))
    await settle()

    const callsAfterSwitch = searches().slice(callsBeforeSwitch)
    expect(callsAfterSwitch).toContainEqual({ providerId: 'vmware-a', namePrefix: 'TEST-' })
    expect(callsAfterSwitch.every(search => search.namePrefix !== 'PROD-')).toBe(true)
    expect(searchbox()).toHaveValue('')
  })

  it('does not revive an old server search after the scope comes and goes', async () => {
    const { rerender } = render(step('vmware-a', null), { wrapper: createWrapper() })
    await screen.findByText('VM-01')
    await searchOnServer('vmware-a')

    rerender(step('vmware-a', { vmPrefix: 'TEST-', vmTags: [] }))
    await settle()
    const callsBeforeReturn = fetchVmwareInventory.mock.calls.length
    rerender(step('vmware-a', { vmPrefix: null, vmTags: [] }))
    await settle()

    expect(searchbox()).toHaveValue('')
    expect(searches().slice(callsBeforeReturn).every(search => search.namePrefix !== 'PROD-')).toBe(true)
  })

  it('starts an empty server search when the same provider loses its fixed scope', async () => {
    const user = userEvent.setup()
    const { rerender } = render(step('vmware-a', { vmPrefix: 'TEST-' }), { wrapper: createWrapper() })
    await screen.findByText('VM-01')
    await user.type(searchbox(), 'DB')

    rerender(step('vmware-a', { vmPrefix: null, vmTags: [] }))
    await settle()

    expect(searchbox()).toHaveValue('')
    expect(searches()).toContainEqual({ providerId: 'vmware-a' })
    expect(searches().every(search => search.namePrefix !== 'DB')).toBe(true)
  })
})
