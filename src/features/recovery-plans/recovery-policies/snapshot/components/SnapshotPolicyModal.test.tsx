import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotPolicyRecordOutput } from '@/generated/query/zod'
import { SnapshotPolicyModal } from './SnapshotPolicyModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: SnapshotPolicyRecordOutput = {
  id: 'critical-15m',
  name: 'Critical — 15 min',
  description: 'Every 15 minutes, retained 3 hours.',
  level: 'critical',
  frequency_value: 15,
  frequency_unit: 'minutes',
  retention_value: 3,
  retention_unit: 'hours',
  max_snapshots: 12,
  flashcopy_copy_rate: 0,
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
  it('keeps the horizontal copy rate slider, exact value and presets synchronized', () => {
    renderModal()
    const slider = screen.getByRole('slider', { name: 'FlashCopy copy rate slider' })
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    expect(slider).toHaveValue('0')
    expect(slider).toHaveAttribute('min', '0')
    expect(slider).toHaveAttribute('max', '150')
    expect(slider).toHaveAttribute('step', '1')
    expect(screen.getByText('Background copying off')).toBeVisible()
    fireEvent.change(slider, { target: { value: '73' } })
    expect(input).toHaveValue(73)
    expect(screen.getByText('Background copying on')).toBeVisible()
    fireEvent.change(input, { target: { value: '100' } })
    expect(slider).toHaveValue('100')
    expect(screen.getByRole('button', { name: '100' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '150' }))
    expect(input).toHaveValue(150)
    expect(slider).toHaveValue('150')
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    expect(input).toHaveValue(0)
    expect(slider).toHaveAttribute('aria-valuetext', '0 · Background copying off')
  })

  it('prefills the slider from an existing policy and keeps invalid numeric input for validation', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ policy: { ...policy, flashcopy_copy_rate: 50 } })
    const slider = screen.getByRole('slider', { name: 'FlashCopy copy rate slider' })
    expect(slider).toHaveValue('50')
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    fireEvent.change(input, { target: { value: '151' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    expect(input).toHaveValue(151)
    expect(slider).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a whole number from 0 to 150')).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.change(slider, { target: { value: '100' } })
    expect(input).toHaveValue(100)
    expect(screen.queryByText('Enter a whole number from 0 to 150')).not.toBeInTheDocument()
  })

  it('saves the slider value and disables all copy rate controls while saving', async () => {
    const onClose = vi.fn()
    let finish!: (response: Response) => void
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => new Promise<Response>(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })
    fillCreateForm()
    const slider = screen.getByRole('slider', { name: 'FlashCopy copy rate slider' })
    fireEvent.change(slider, { target: { value: '73' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(slider).toBeDisabled() })
    expect(screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })).toBeDisabled()
    for (const value of ['0', '50', '100', '150']) expect(screen.getByRole('button', { name: value })).toBeDisabled()
    const init = fetchMock.mock.calls[0]?.[1]
    if (typeof init?.body !== 'string') throw new Error('Expected a JSON submit body')
    const payload: unknown = JSON.parse(init.body)
    expect(payload).toMatchObject({ flashcopy_copy_rate: 73 })
    finish(Response.json({ snapshot_policies: [{ ...policy, flashcopy_copy_rate: 73 }] }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
  })

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
      flashcopy_copy_rate: 0,
      enabled: true,
    }))
  })

  it('prefills edit data, locks the id and preserves a null snapshot limit', () => {
    renderModal({ policy: { ...policy, max_snapshots: null }, existingPolicies: [policy] })

    expect(screen.getByRole('heading', { name: 'Edit policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Policy name')).toHaveValue('Critical — 15 min')
    expect(screen.getByLabelText('Maximum snapshots')).toHaveValue(null)
  })

  it('shows backend detail in the shared submit alert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Snapshot policy already exists.' }), { status: 409, headers: { 'Content-Type': 'application/json' } })))
    renderModal()
    fillCreateForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Snapshot policy already exists.')
  })

  it.each([0, 50, 150])('creates a policy with copy rate %s', async rate => {
    const onClose = vi.fn()
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
      new Response(JSON.stringify({ snapshot_policies: [{ ...policy, flashcopy_copy_rate: rate }] }), { status: 200 }),
    ))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose })
    fillCreateForm()
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    expect(input).toHaveValue(0)
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '150')
    expect(input).toHaveAttribute('step', '1')
    fireEvent.change(input, { target: { value: String(rate) } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/submit_policy')
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain(`"flashcopy_copy_rate":${String(rate)},`)
  })

  it.each([50, 100])('edits a policy with copy rate %s without losing its existing setting', async rate => {
    const onClose = vi.fn()
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
      new Response(JSON.stringify({ snapshot_policies: [{ ...policy, flashcopy_copy_rate: rate }] }), { status: 200 }),
    ))
    vi.stubGlobal('fetch', fetchMock)
    renderModal({ onClose, policy: { ...policy, flashcopy_copy_rate: 50 } })
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    expect(input).toHaveValue(50)
    fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Renamed policy' } })
    if (rate !== 50) fireEvent.change(input, { target: { value: String(rate) } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({
      id: 'critical-15m', name: 'Renamed policy', description: 'Every 15 minutes, retained 3 hours.',
      level: 'critical', frequency_value: 15, frequency_unit: 'minutes', retention_value: 3,
      retention_unit: 'hours', max_snapshots: 12, flashcopy_copy_rate: rate, enabled: true,
    }))
  })

  it.each(['-1', '151', '10.5', '', ' ', 'invalid', 'Infinity'])('blocks copy rate input "%s" before submitting', async value => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderModal()
    fillCreateForm()
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    fireEvent.change(input, { target: { value } })
    await userEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    expect(screen.getByText('Enter a whole number from 0 to 150')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '100' } })
    expect(screen.queryByText('Enter a whole number from 0 to 150')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('submits copy rate with Enter and disables the field while saving', async () => {
    const onClose = vi.fn()
    let finish: (response: Response) => void = () => { throw new Error('Request has not started') }
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    renderModal({ onClose })
    fillCreateForm()
    const input = screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })
    fireEvent.change(input, { target: { value: '50' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => { expect(input).toBeDisabled() })
    finish(new Response(JSON.stringify({ snapshot_policies: [{ ...policy, flashcopy_copy_rate: 50 }] }), { status: 200 }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
  })
})
