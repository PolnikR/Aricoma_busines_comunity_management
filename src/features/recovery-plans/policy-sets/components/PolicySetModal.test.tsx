import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { useGetCleanRoomPolicies } from '@/generated/query/clean-room-policies/clean-room-policies.gen'
import type { PolicySetRecord } from '@/generated/query/zod'
import { PolicySetModal } from './PolicySetModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('@/generated/query/snapshot-policies/snapshot-policies.gen', () => ({
  useGetPolicies: () => ({
    data: [
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

const policySet: PolicySetRecord = {
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
  mockUseRecoveryAppPolicies.mockReturnValue({
    data: [recoveryAppPolicy],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
  mockUseCleanRoomPolicies.mockReturnValue({
    data: [{ id: 'enforce-clean-target', name: 'Enforce Clean Target', description: 'Remove conflicts.', enabled: true }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetCleanRoomPolicies>)
})

describe('PolicySetModal', () => {
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
      data: [],
      isLoading: false,
      error: new Error('private backend details'),
      refetch,
    } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
    renderModal()

    expect(screen.getByRole('alert')).toHaveTextContent('Recovery application policies could not be loaded.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows backend detail for dependent policy lookup failures', () => {
    mockUseRecoveryAppPolicies.mockReturnValue({
      data: [],
      isLoading: false,
      error: new OrvalApiError(503, 'Unavailable', { detail: 'Recovery policy service is unavailable.' }),
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetRecoveryAppPolicies>)
    mockUseCleanRoomPolicies.mockReturnValue({
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

    expect(screen.getByText('Stored recovery application policy removed-policy is not available.')).toBeInTheDocument()
  })
})
