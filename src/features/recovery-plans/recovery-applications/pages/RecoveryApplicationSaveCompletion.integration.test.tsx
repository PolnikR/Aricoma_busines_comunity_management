import { useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
import type { RecoveryApplicationFormState, RecoveryTier } from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const tiers: Record<string, RecoveryTier> = {
  database: {
    order: 1, description: 'Database server tier',
    recovery_group: {
      id: 'database_group', name: 'Database Group', description: 'Database recovery group',
      vms: [{ name: 'db-01', order: 1, hostname: 'db-01.example.test', ip_address: '192.0.2.10',
        os: 'Linux', cpu: 8, memory_gb: 32, storage_gb: 200 }],
    },
  },
  web: {
    order: 2, description: 'Web server tier',
    recovery_group: {
      id: 'web_group', name: 'Web Group', description: 'Web recovery group',
      vms: [{ name: 'web-01', order: 1 }],
    },
  },
}
const draft: RecoveryApplicationFormState = {
  fileName: 'Finance', name: 'Finance', description: 'Finance recovery', environment: 'prod',
  policySetId: 'test_1_hour_ps', platform: 'vmware-vcenter-01', targetProviderId: 'vmware-dr-01',
  orchestrationProviderId: 'airflow-01', pushToOrchestrator: false,
  notificationEmail: 'dr-team@example.test', tiers: new Map(Object.entries(tiers)),
}

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'Finance' }),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('../hooks/useRecoveryApplications', async importOriginal => ({
  ...await importOriginal<typeof import('../hooks/useRecoveryApplications')>(),
  useRecoveryApplications: () => ({
    data: [{
      id: 'Finance.json', policySetId: 'test_1_hour_ps', pushToOrchestrator: false,
      orchestrationProviderId: 'airflow-01',
      data: { application: { name: 'Finance', description: 'Finance recovery', environment: 'prod',
        platform: 'VMWARE', source_provider_id: 'vmware-vcenter-01', target_provider_id: 'vmware-dr-01',
        notificationEmail: 'dr-team@example.test', tiers } },
    }],
    isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  }),
}))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({ data: [{ id: 'airflow-01', url: 'https://airflow.test' }] }),
}))
vi.mock('@/generated/query/providers/providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({ data: [
    { id: 'vmware-vcenter-01', type: 'VMWARE', role: 'source' },
    { id: 'vmware-dr-01', type: 'VMWARE', role: 'target' },
    { id: 'ibm-power-01', type: 'IBM_POWER', role: 'source' },
  ] }),
}))
vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: function DraftFixture({ initialData, onSave, onDirtyChange, isSaving, onCancel }: {
    initialData?: RecoveryApplicationFormState
    onSave: (state: RecoveryApplicationFormState) => void
    onDirtyChange: (dirty: boolean) => void
    isSaving: boolean
    onCancel: () => void
  }) {
    const [state, setState] = useState(initialData ?? draft)
    return <fieldset disabled={isSaving}>
      <input aria-label="Draft name" value={state.name} onChange={event => {
        setState({ ...state, name: event.target.value })
        onDirtyChange(true)
      }} />
      <button disabled={isSaving} onClick={() => { onSave(state) }}>Save draft</button>
      <button disabled={isSaving} onClick={() => { onSave({ ...state, pushToOrchestrator: true }) }}>Save and push</button>
      <button onClick={() => {
        setState({ ...state, platform: 'ibm-power-01', targetProviderId: 'ibm-power-01' })
        onDirtyChange(true)
      }}>Alter draft providers</button>
      <button onClick={onCancel}>Cancel draft</button>
    </fieldset>
  },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe.each([
  ['Create', RecoveryApplicationBuilderPage], ['Edit', RecoveryApplicationEditorPage],
] as const)('%s real mutation completion', (name, Page) => {
  it.each([false, true])('sends the exact rich request with stored provider authority and push=%s', async pushToOrchestrator => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify({ applications: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>)
    const user = userEvent.setup()
    if (name === 'Edit') await user.click(screen.getByRole('button', { name: 'Alter draft providers' }))
    await user.click(screen.getByRole('button', { name: pushToOrchestrator ? 'Save and push' : 'Save draft' }))
    if (pushToOrchestrator) await screen.findByRole('dialog')
    else await waitFor(() => { expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications') })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [input, init] = fetchMock.mock.calls[0] ?? []
    const url = new URL(input ?? '', 'http://localhost')
    expect({ path: url.pathname, params: Object.fromEntries(url.searchParams), method: init?.method }).toEqual({
      path: '/api/submit_recovery_dag',
      params: { provider_id: 'airflow-01', push_to_orchestrator: String(pushToOrchestrator) },
      method: 'POST',
    })
    expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({
      id: 'Finance', policy_set_id: 'test_1_hour_ps',
      application: {
        name: 'Finance', description: 'Finance recovery', environment: 'prod', platform: 'VMWARE',
        source_provider_id: 'vmware-vcenter-01', target_provider_id: 'vmware-dr-01',
        notificationEmail: 'dr-team@example.test', tiers,
      },
    })
    client.clear()
  })

  it('retains the edited draft and guard after an HTTP failure, then exits after a successful retry', async () => {
    const user = userEvent.setup()
    let respond!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { respond = resolve })
    const fetchMock = vi.fn().mockReturnValueOnce(pending)
      .mockResolvedValueOnce(new Response(JSON.stringify({ applications: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>)
    await user.type(screen.getByRole('textbox', { name: 'Draft name' }), ' updated')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Draft name' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Cancel draft' }))
    await user.type(screen.getByRole('textbox', { name: 'Draft name' }), 'LostChange')
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => {
      respond(new Response(JSON.stringify({ detail: 'Save rejected' }), { status: 409 }))
      await pending
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Save rejected')
    expect(screen.getByRole('textbox', { name: 'Draft name' })).toHaveValue('Finance updated')
    expect(screen.getByRole('textbox', { name: 'Draft name' })).toBeEnabled()
    const unload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(unload)
    expect(unload.defaultPrevented).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Draft name' }))
    await user.type(screen.getByRole('textbox', { name: 'Draft name' }), 'FinanceCorrected')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => { expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications') })
    const savedUnload = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(savedUnload)
    expect(savedUnload.defaultPrevented).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    client.clear()
  })

  it('shows the missing-result dialog after real wire normalization rather than a Save error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ applications: [] }), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save and push' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('The API did not return an orchestrator push result.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
    expect(navigate).toHaveBeenCalledOnce()
    client.clear()
  })
})
