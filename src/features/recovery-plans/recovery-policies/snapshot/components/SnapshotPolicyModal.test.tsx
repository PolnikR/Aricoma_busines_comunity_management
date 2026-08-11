import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotPolicy } from '../model/snapshotPolicyTypes'
import { SnapshotPolicyModal } from './SnapshotPolicyModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: SnapshotPolicy = {
  id: 'critical-15m',
  name: 'Critical — 15 min',
  description: 'Every 15 minutes, retained 3 hours.',
  level: 'critical',
  frequencyValue: 15,
  frequencyUnit: 'minutes',
  retentionValue: 3,
  retentionUnit: 'hours',
  maxSnapshots: 12,
  enabled: true,
}

function renderModal(props: Partial<React.ComponentProps<typeof SnapshotPolicyModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <SnapshotPolicyModal open onClose={vi.fn()} existingPolicies={[]} {...props} />
    </QueryClientProvider>,
  )
}

function fillCreateForm() {
  fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: 'high-1h' } })
  fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'High — hourly' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Every hour.' } })
  fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'high' } })
  fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Frequency unit'), { target: { value: 'hours' } })
  fireEvent.change(screen.getByLabelText('Retention'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Retention unit'), { target: { value: 'days' } })
  fireEvent.change(screen.getByLabelText('Maximum snapshots'), { target: { value: '24' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SnapshotPolicyModal', () => {
  it('renders the complete policy contract with enabled selected by default', () => {
    renderModal()

    expect(screen.getByText('Configure a policy for automated snapshot creation and retention.')).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Frequency')).toBeInTheDocument()
    expect(screen.getByLabelText('Retention')).toBeInTheDocument()
    expect(screen.getByLabelText('Maximum snapshots')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked()
  })

  it('submits normalized values and updates the shared query cache', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      snapshot_policies: [{
        id: 'high-1h',
        name: 'High — hourly',
        description: 'Every hour.',
        level: 'high',
        frequency_value: 1,
        frequency_unit: 'hours',
        retention_value: 1,
        retention_unit: 'days',
        max_snapshots: 24,
        enabled: true,
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'high-1h',
      name: 'High — hourly',
      description: 'Every hour.',
      level: 'high',
      frequency_value: 1,
      frequency_unit: 'hours',
      retention_value: 1,
      retention_unit: 'days',
      max_snapshots: 24,
      enabled: true,
    }))
  })

  it('prefills edit data, locks the id and preserves a null snapshot limit', () => {
    renderModal({ policy: { ...policy, maxSnapshots: null }, existingPolicies: [policy] })

    expect(screen.getByRole('heading', { name: 'Edit policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy name')).toHaveValue('Critical — 15 min')
    expect(screen.getByLabelText('Maximum snapshots')).toHaveValue(null)
  })
})
