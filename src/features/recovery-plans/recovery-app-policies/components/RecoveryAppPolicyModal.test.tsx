import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryAppPolicy } from '../model/recoveryAppPolicyTypes'
import { RecoveryAppPolicyModal } from './RecoveryAppPolicyModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: RecoveryAppPolicy = {
  id: 'critical-daily-latest',
  name: 'Critical - Daily DR Test',
  description: 'Daily recovery test using the newest available snapshot.',
  level: 'critical',
  frequencyValue: 1,
  frequencyUnit: 'days',
  retentionValue: 4,
  retentionUnit: 'hours',
  bootVerify: true,
  snapshotSelectionMode: 'latest',
  snapshotMaxAgeValue: null,
  snapshotMaxAgeUnit: null,
  snapshotTargetTime: null,
  enabled: true,
}

function renderModal(props: Partial<React.ComponentProps<typeof RecoveryAppPolicyModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <RecoveryAppPolicyModal open onClose={vi.fn()} existingPolicies={[]} {...props} />
    </QueryClientProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('RecoveryAppPolicyModal', () => {
  it('renders scheduling, snapshot selection and enabled controls', () => {
    renderModal()

    expect(screen.getByLabelText('Policy ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Snapshot selection')).toHaveValue('latest')
    expect(screen.getByRole('checkbox', { name: 'Boot verification' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked()
  })

  it('submits time-range policies with the backend wire contract', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      recovery_app_policies: [{
        id: 'high-weekly', name: 'High weekly', description: 'Weekly', level: 'high',
        frequency_value: 7, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
        boot_verify: true, snapshot_selection_mode: 'time_range', snapshot_max_age_value: 2,
        snapshot_max_age_unit: 'hours', snapshot_target_time: null, enabled: true,
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: 'high-weekly' } })
    fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'High weekly' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Weekly' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'high' } })
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Frequency unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Retention'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Retention unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Snapshot selection'), { target: { value: 'time_range' } })
    fireEvent.change(screen.getByLabelText('Maximum snapshot age'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Maximum snapshot age unit'), { target: { value: 'hours' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Boot verification' }))

    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.body).toBe(JSON.stringify({
      id: 'high-weekly', name: 'High weekly', description: 'Weekly', level: 'high',
      frequency_value: 7, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
      boot_verify: true, snapshot_selection_mode: 'time_range', snapshot_max_age_value: 2,
      snapshot_max_age_unit: 'hours', snapshot_target_time: null, enabled: true,
    }))
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policy, existingPolicies: [policy] })
    expect(screen.getByRole('heading', { name: 'Edit policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Snapshot selection')).toHaveValue('latest')
  })
})
