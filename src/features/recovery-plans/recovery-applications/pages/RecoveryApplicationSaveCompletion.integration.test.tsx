import { useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const draft: RecoveryApplicationFormState = {
  fileName: 'finance_app', name: 'Finance', description: 'Finance recovery', environment: 'prod',
  policySetId: 'test-policy', platform: 'source', targetProviderId: 'target',
  orchestrationProviderId: 'airflow', pushToOrchestrator: false, notificationEmail: null, tiers: new Map(),
}

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
  useParams: () => ({ id: 'finance_app' }),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('../hooks/useRecoveryApplications', async importOriginal => ({
  ...await importOriginal<typeof import('../hooks/useRecoveryApplications')>(),
  useRecoveryApplications: () => ({
    data: [{
      id: 'finance_app.json', policySetId: 'test-policy', pushToOrchestrator: false,
      orchestrationProviderId: 'airflow',
      data: { application: { name: 'Finance', description: 'Finance recovery', environment: 'prod',
        platform: 'VMWARE', source_provider_id: 'source', target_provider_id: 'target', tiers: {} } },
    }],
    isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  }),
}))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({ data: [{ id: 'airflow', url: 'https://airflow.test' }] }),
}))
vi.mock('@/generated/query/providers/providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({ data: [
    { id: 'source', type: 'VMWARE', role: 'source' }, { id: 'target', type: 'VMWARE', role: 'target' },
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
] as const)('%s real mutation completion', (_name, Page) => {
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
