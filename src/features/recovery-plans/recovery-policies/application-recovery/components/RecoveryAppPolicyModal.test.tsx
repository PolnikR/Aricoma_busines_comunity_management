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

const exactTimePolicy: RecoveryAppPolicy = {
  ...policy,
  id: 'medium-monthly-exacttime',
  name: 'Medium - Monthly DR Test',
  description: 'Monthly recovery test using the snapshot closest to 02:00.',
  level: 'medium',
  frequencyValue: 30,
  retentionValue: 2,
  retentionUnit: 'days',
  snapshotSelectionMode: 'exact_time',
  snapshotTargetTime: '02:00',
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
    expect(screen.getByText('Configure a policy for automated application recovery tests and snapshot selection.')).toBeInTheDocument()
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
    expect(JSON.parse(init.body as string)).toEqual({
      id: 'high-weekly', name: 'High weekly', description: 'Weekly', level: 'high',
      frequency_value: 7, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
      boot_verify: true, snapshot_selection_mode: 'time_range', snapshot_max_age_value: 2,
      snapshot_max_age_unit: 'hours', enabled: true,
    })
  })

  it('submits latest without mode-specific fields after switching from time range', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      recovery_app_policies: [{
        id: 'critical-daily', name: 'Critical daily', description: 'Daily', level: 'critical',
        frequency_value: 1, frequency_unit: 'days', retention_value: 4, retention_unit: 'hours',
        boot_verify: false, snapshot_selection_mode: 'latest', snapshot_max_age_value: null,
        snapshot_max_age_unit: null, snapshot_target_time: null, enabled: true,
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })

    fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: 'critical-daily' } })
    fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Critical daily' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Daily' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'critical' } })
    fireEvent.change(screen.getByLabelText('Snapshot selection'), { target: { value: 'time_range' } })
    fireEvent.change(screen.getByLabelText('Maximum snapshot age'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Maximum snapshot age unit'), { target: { value: 'hours' } })
    fireEvent.change(screen.getByLabelText('Snapshot selection'), { target: { value: 'latest' } })
    expect(screen.queryByLabelText('Maximum snapshot age')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      id: 'critical-daily', name: 'Critical daily', description: 'Daily', level: 'critical',
      frequency_value: 1, frequency_unit: 'minutes', retention_value: 1, retention_unit: 'days',
      boot_verify: false, snapshot_selection_mode: 'latest', enabled: true,
    })
  })

  it('submits exact-time policies without max-age fields', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      recovery_app_policies: [{
        id: exactTimePolicy.id, name: exactTimePolicy.name, description: exactTimePolicy.description, level: exactTimePolicy.level,
        frequency_value: exactTimePolicy.frequencyValue, frequency_unit: exactTimePolicy.frequencyUnit,
        retention_value: exactTimePolicy.retentionValue, retention_unit: exactTimePolicy.retentionUnit,
        boot_verify: exactTimePolicy.bootVerify, snapshot_selection_mode: 'exact_time',
        snapshot_max_age_value: null, snapshot_max_age_unit: null, snapshot_target_time: '02:00', enabled: true,
      }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose, policy: exactTimePolicy, existingPolicies: [exactTimePolicy] })

    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toEqual({
      id: exactTimePolicy.id, name: exactTimePolicy.name, description: exactTimePolicy.description, level: exactTimePolicy.level,
      frequency_value: 30, frequency_unit: 'days', retention_value: 2, retention_unit: 'days',
      boot_verify: true, snapshot_selection_mode: 'exact_time', snapshot_target_time: '02:00', enabled: true,
    })
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policy, existingPolicies: [policy] })
    expect(screen.getByRole('heading', { name: 'Edit policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Snapshot selection')).toHaveValue('latest')
  })

  it('shows backend detail in the shared submit alert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Recovery policy already exists.' }), { status: 409, headers: { 'Content-Type': 'application/json' } })))
    renderModal()
    fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: 'duplicate' } })
    fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Duplicate' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Duplicate.' } })
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'high' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Recovery policy already exists.')
  })
})
