import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  policyIds: ['medium-6h'],
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

describe('PolicySetModal', () => {
  it('renders the id, name, description and available policy options', () => {
    renderModal()

    expect(screen.getByLabelText('Policy set ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' })).toBeInTheDocument()
  })

  it('submits normalized values and updates the shared query cache', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      policy_sets: [{
        id: 'tier3-web',
        name: 'Tier 3 web',
        description: 'Low priority web tier.',
        policy_ids: ['low-24h'],
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'tier3-web' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Tier 3 web' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Low priority web tier.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'tier3-web',
      name: 'Tier 3 web',
      description: 'Low priority web tier.',
      policy_ids: ['low-24h'],
    }))
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policySet, existingPolicySets: [policySet] })

    expect(screen.getByRole('heading', { name: 'Edit policy set' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy set ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy set name')).toHaveValue('Tier 2 applications')
    expect(screen.getByRole('radio', { name: 'Medium — 6h (medium-6h)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Low — 24h (low-24h)' })).not.toBeChecked()
  })

  it('requires at least one policy before submitting', () => {
    renderModal()

    fireEvent.change(screen.getByLabelText('Policy set ID'), { target: { value: 'empty-set' } })
    fireEvent.change(screen.getByLabelText('Policy set name'), { target: { value: 'Empty set' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'No policies yet.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy set' }))

    expect(screen.getByText('Select at least one snapshot policy')).toBeInTheDocument()
  })
})
