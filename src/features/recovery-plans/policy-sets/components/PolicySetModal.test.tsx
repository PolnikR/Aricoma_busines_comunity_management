import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetModal } from './PolicySetModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [
      { id: 'medium-6h', name: 'Medium — 6h', description: '', level: 'medium', frequencyValue: 6, frequencyUnit: 'hours', retentionValue: 7, retentionUnit: 'days', maxSnapshots: null, enabled: true },
      { id: 'low-24h', name: 'Low — 24h', description: '', level: 'low', frequencyValue: 24, frequencyUnit: 'hours', retentionValue: 30, retentionUnit: 'days', maxSnapshots: null, enabled: true },
    ],
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies', () => ({
  useRecoveryAppPolicies: vi.fn(),
}))

const mockUseRecoveryAppPolicies = vi.mocked(useRecoveryAppPolicies)
const recoveryAppPolicy = {
  id: 'critical-daily-latest',
  name: 'Critical — Daily DR Test',
  description: '',
  level: 'critical',
  frequencyValue: 1,
  frequencyUnit: 'days' as const,
  retentionValue: 4,
  retentionUnit: 'hours' as const,
  bootVerify: true,
  snapshotSelectionMode: 'latest' as const,
  snapshotMaxAgeValue: null,
  snapshotMaxAgeUnit: null,
  snapshotTargetTime: null,
  enabled: true,
}

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshotPolicyId: 'medium-6h',
  recoveryAppPolicyId: 'critical-daily-latest',
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
  } as unknown as ReturnType<typeof useRecoveryAppPolicies>)
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
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'tier3-web' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Tier 3 web' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Low priority web tier.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Critical — Daily DR Test (critical-daily-latest)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'tier3-web',
      name: 'Tier 3 web',
      description: 'Low priority web tier.',
        snapshot_policy_id: 'low-24h',
      recovery_app_policy_id: 'critical-daily-latest',
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
    } as unknown as ReturnType<typeof useRecoveryAppPolicies>)
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'missing-recovery-policy' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Missing recovery policy' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No recovery policy yet.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select one recovery application policy')).toBeInTheDocument()
  })

  it('shows a retry action when recovery application policies fail to load', () => {
    const refetch = vi.fn()
    mockUseRecoveryAppPolicies.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('private backend details'),
      refetch,
    } as unknown as ReturnType<typeof useRecoveryAppPolicies>)
    renderModal()

    expect(screen.getByRole('alert')).toHaveTextContent('Recovery application policies could not be loaded.')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps an unavailable recovery policy reference visible while editing', () => {
    renderModal({
      policySet: { ...policySet, recoveryAppPolicyId: 'removed-policy' },
      existingPolicySets: [policySet],
    })

    expect(screen.getByText('Stored recovery application policy removed-policy is not available.')).toBeInTheDocument()
  })
})
