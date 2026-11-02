import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { useGetCleanRoomPolicies } from '@/generated/query/clean-room-policies/clean-room-policies.gen'
import type { PolicySetRecordOutput } from '@/generated/query/zod'
import { PolicySetModal } from './PolicySetModal'
import en from '@/locales/en.json'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
const { snapshotState } = vi.hoisted(() => ({ snapshotState: { pending: false, error: null as Error | null, fetchStatus: 'idle', refetch: vi.fn() } }))

vi.mock('@/generated/query/snapshot-policies/snapshot-policies.gen', () => ({
  useGetPolicies: () => ({
    status: snapshotState.error ? 'error' : snapshotState.pending ? 'pending' : 'success',
    fetchStatus: snapshotState.fetchStatus,
    error: snapshotState.error,
    refetch: snapshotState.refetch,
    data: snapshotState.pending ? undefined : [
      { id: 'medium-6h', name: 'Medium — 6h', description: '', level: 'medium', frequency_value: 6, frequency_unit: 'hours', retention_value: 7, retention_unit: 'days', max_snapshots: null, enabled: true },
      { id: 'low-24h', name: 'Low — 24h', description: '', level: 'low', frequency_value: 24, frequency_unit: 'hours', retention_value: 30, retention_unit: 'days', max_snapshots: null, enabled: true },
    ],
  }),
}))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({
  useGetRecoveryAppPolicies: vi.fn(),
  useSubmitRecoveryAppPolicy: vi.fn(),
}))
vi.mock('@/generated/query/clean-room-policies/clean-room-policies.gen', () => ({
  useGetCleanRoomPolicies: vi.fn(),
  useSubmitCleanRoomPolicy: vi.fn(),
}))

const mockUseRecoveryAppPolicies = vi.mocked(useGetRecoveryAppPolicies)
const mockUseCleanRoomPolicies = vi.mocked(useGetCleanRoomPolicies)
const recoveryAppPolicy = {
  id: 'critical-daily-latest',
  name: 'Critical — Daily DR Test',
  description: '',
  level: 'critical',
  frequency_value: 1,
  frequency_unit: 'days' as const,
  retention_value: 4,
  retention_unit: 'hours' as const,
  boot_verify: true,
  snapshot_selection_mode: 'latest' as const,
  snapshot_max_age_value: null,
  snapshot_max_age_unit: null,
  snapshot_target_time: null,
  enabled: true,
}

const policySet: PolicySetRecordOutput = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshot_policy_id: 'medium-6h',
  recovery_app_policy_id: 'critical-daily-latest',
  clean_room_policy_id: 'enforce-clean-target',
}

function renderModal(props: Partial<React.ComponentProps<typeof PolicySetModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PolicySetModal open onClose={vi.fn()} existingPolicySets={[]} {...props} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  snapshotState.pending = false
  snapshotState.error = null
  snapshotState.fetchStatus = 'idle'
  snapshotState.refetch.mockClear()
  mockUseRecoveryAppPolicies.mockReturnValue({
    status: 'success',
    fetchStatus: 'idle',
    data: [recoveryAppPolicy],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
  mockUseCleanRoomPolicies.mockReturnValue({
    status: 'success',
    fetchStatus: 'idle',
    data: [{ id: 'enforce-clean-target', name: 'Enforce Clean Target', description: 'Remove conflicts.', enabled: true }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetCleanRoomPolicies>)
})

describe('PolicySetModal', () => {
  it.each(['create', 'edit'] as const)('keeps %s values and payload unchanged after using inline field help', async mode => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ policy_sets: [policySet] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose, ...(mode === 'edit' ? { policySet } : {}) })
    const user = userEvent.setup()
    if (mode === 'create') {
      await user.type(screen.getByLabelText('Policy set ID'), policySet.id)
      await user.type(screen.getByLabelText('Policy set name'), policySet.name)
      await user.type(screen.getByLabelText('Description'), policySet.description ?? '')
      for (const name of ['Medium — 6h (medium-6h)', 'Critical — Daily DR Test (critical-daily-latest)', 'Enforce Clean Target (enforce-clean-target)']) {
        await user.click(screen.getByRole('radio', { name }))
      }
    }
    const selected = screen.getAllByRole('radio').filter(radio => (radio as HTMLInputElement).checked)
    expect(selected).toHaveLength(3)
    for (const field of ['snapshot_policy_id', 'recovery_app_policy_id', 'clean_room_policy_id'] as const) {
      const trigger = screen.getByRole('button', { name: en[`policySets.fieldHelp.${field}.trigger`] })
      expect(trigger.closest('section')?.querySelector('h3')?.parentElement).toContainElement(trigger)
      await user.click(trigger)
      expect(screen.getByRole('dialog', { name: en[`policySets.fieldHelp.${field}.title`] })).toHaveTextContent(en[`policySets.fieldHelp.${field}.intro`])
      await user.keyboard('{Escape}')
      expect(trigger).toHaveFocus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      const popover = screen.getByRole('dialog', { name: en[`policySets.fieldHelp.${field}.title`] })
      await user.click(within(popover).getByRole('button', { name: 'Close help' }))
      expect(trigger).toHaveFocus()
      for (const radio of selected) expect(radio).toBeChecked()
      expect(screen.getByLabelText('Policy set name')).toHaveValue(policySet.name)
      expect(screen.getByLabelText('Description')).toHaveValue(policySet.description)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    }
    await user.click(screen.getByRole('button', { name: mode === 'edit' ? 'Edit policy set' : 'Create policy set' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify(policySet))
  })

  it.each(['loading', 'empty', 'error'] as const)('keeps field help available with a %s catalog', async status => {
    snapshotState.pending = status === 'loading'
    snapshotState.error = status === 'error' ? new Error('unavailable') : null
    if (status === 'empty') mockUseCleanRoomPolicies.mockReturnValue({ status: 'success', fetchStatus: 'idle', data: [], error: null, refetch: vi.fn() } as unknown as ReturnType<typeof useGetCleanRoomPolicies>)
    renderModal()
    for (const field of ['snapshot_policy_id', 'recovery_app_policy_id', 'clean_room_policy_id'] as const) {
      await userEvent.click(screen.getByRole('button', { name: en[`policySets.fieldHelp.${field}.trigger`] }))
      expect(screen.getByRole('dialog', { name: en[`policySets.fieldHelp.${field}.title`] })).toBeInTheDocument()
      await userEvent.keyboard('{Escape}')
    }
  })

  it.each(['fetching', 'paused'] as const)('prevents repeated retry while snapshot recovery is %s', fetchStatus => {
    snapshotState.error = new Error('refresh failed')
    snapshotState.fetchStatus = fetchStatus
    renderModal({ policySet })
    expect(screen.getByRole('button', { name: 'Retry Snapshot policies' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeChecked()
  })

  it('waits for snapshot data without claiming that no policies exist', () => {
    snapshotState.pending = true
    renderModal()
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for policy data.')
    expect(screen.queryByText('No snapshot policies are available. Create a snapshot policy first.')).not.toBeInTheDocument()
  })

  it('keeps cached snapshot options, the edited draft and the discard guard after retry', () => {
    snapshotState.error = new Error('refresh failed')
    renderModal({ policySet })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Edited draft' } })
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeChecked()
    expect(screen.getByRole('alert')).toHaveTextContent('Previously loaded data is shown.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry Snapshot policies' }))
    expect(snapshotState.refetch).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('Policy set name')).toHaveValue('Edited draft')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog', { name: 'Discard unsaved policy set changes?' })).toBeInTheDocument()
  })

  it('renders the id, name, description and available policy options', () => {
    renderModal()

    expect(screen.getByLabelText('Policy set ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Enforce Clean Target (enforce-clean-target)' })).toBeInTheDocument()
  })

  it('submits normalized values and updates the shared query cache', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      policy_sets: [{
        id: 'tier3-web',
        name: 'Tier 3 web',
        description: 'Low priority web tier.',
        snapshot_policy_id: 'low-24h',
        recovery_app_policy_id: 'critical-daily-latest',
        clean_room_policy_id: 'enforce-clean-target',
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'tier3-web' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Tier 3 web' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Low priority web tier.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Enforce Clean Target (enforce-clean-target)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'tier3-web',
      name: 'Tier 3 web',
      description: 'Low priority web tier.',
      snapshot_policy_id: 'low-24h',
      recovery_app_policy_id: 'critical-daily-latest',
      clean_room_policy_id: 'enforce-clean-target',
    }))
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policySet, existingPolicySets: [policySet] })

    expect(screen.getByRole('heading', { name: 'Edit policy set' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy set name')).toHaveValue('Tier 2 applications')
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Enforce Clean Target (enforce-clean-target)' })).toBeChecked()
  })

  it('requires at least one policy before submitting', () => {
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'empty-set' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Empty set' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No policies yet.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select at least one snapshot policy')).toBeInTheDocument()
  })

  it('requires a recovery application policy before submitting', () => {
    mockUseRecoveryAppPolicies.mockReturnValue({
      status: 'success',
      fetchStatus: 'idle',
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'missing-recovery-policy' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Missing recovery policy' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No recovery policy yet.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select one recovery application policy')).toBeInTheDocument()
  })

  it('requires a clean room policy before submitting', () => {
    mockUseCleanRoomPolicies.mockReturnValue({
      status: 'success',
      fetchStatus: 'idle',
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetCleanRoomPolicies>)
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'missing-clean-room-policy' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Missing clean room policy' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No clean room policy yet.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select one clean room policy')).toBeInTheDocument()
  })

  it('shows a retry action when recovery application policies fail to load', () => {
    const refetch = vi.fn()
    mockUseRecoveryAppPolicies.mockReturnValue({
      status: 'error',
      fetchStatus: 'idle',
      data: [],
      isLoading: false,
      error: new Error('private backend details'),
      refetch,
    } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
    renderModal()

    expect(screen.getByRole('alert')).toHaveTextContent('Recovery application policy could not be refreshed. Previously loaded data is shown.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry Recovery application policy' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows backend detail for dependent policy lookup failures', () => {
    mockUseRecoveryAppPolicies.mockReturnValue({
      status: 'error',
      fetchStatus: 'idle',
      data: [],
      isLoading: false,
      error: new OrvalApiError(503, 'Unavailable', { detail: 'Recovery policy service is unavailable.' }),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
    mockUseCleanRoomPolicies.mockReturnValue({
      status: 'error',
      fetchStatus: 'idle',
      data: [],
      isLoading: false,
      error: new OrvalApiError(503, 'Unavailable', { detail: 'Clean room policy service is unavailable.' }),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetCleanRoomPolicies>)

    renderModal()

    expect(screen.getByText('Recovery policy service is unavailable.')).toBeInTheDocument()
    expect(screen.getByText('Clean room policy service is unavailable.')).toBeInTheDocument()
  })

  it('shows backend detail in the shared submit alert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      detail: 'Policy set name is already used.',
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })))
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'duplicate-set' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Duplicate set' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Duplicate.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Enforce Clean Target (enforce-clean-target)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save policy set')
    expect(screen.getByRole('alert')).toHaveTextContent('Policy set name is already used.')
  })

  it('keeps an unavailable recovery policy reference visible while editing', () => {
    renderModal({
      policySet: { ...policySet, recovery_app_policy_id: 'removed-policy' },
      existingPolicySets: [policySet],
    })

    expect(screen.getByText('Policy removed-policy was not found in the last successfully loaded catalog.')).toBeInTheDocument()
  })
})
