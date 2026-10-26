import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppPolicyRecord, type RecoveryAppPolicyRecordOutput } from '@/generated/query/zod'
import { RecoveryAppPolicyModal } from './RecoveryAppPolicyModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const policy: RecoveryAppPolicyRecordOutput = {
  id: 'critical-daily-latest',
  name: 'Critical - Daily DR Test',
  description: 'Daily recovery test using the newest available snapshot.',
  level: 'critical',
  frequency_value: 1,
  frequency_unit: 'days',
  retention_value: 4,
  retention_unit: 'hours',
  boot_verify: true,
  snapshot_selection_mode: 'latest',
  snapshot_max_age_value: null,
  snapshot_max_age_unit: null,
  snapshot_target_time: null,
  enabled: true,
  target_lpar_prefix: 'dr_',
  manual_zoning: false,
  manual_wwpn_entry: false,
  source_shutdown_timeout_seconds: 300,
  zoning_wait_minutes: 240,
}

const exactTimePolicy: RecoveryAppPolicyRecordOutput = {
  ...policy,
  id: 'medium-monthly-exacttime',
  name: 'Medium - Monthly DR Test',
  description: 'Monthly recovery test using the snapshot closest to 02:00.',
  level: 'medium',
  frequency_value: 30,
  retention_value: 2,
  retention_unit: 'days',
  snapshot_selection_mode: 'exact_time',
  snapshot_target_time: '02:00',
}

const powerPolicy: RecoveryAppPolicyRecordOutput = {
  ...policy,
  id: 'power-daily',
  target_lpar_prefix: 'p8.dr-',
  manual_zoning: true,
  source_shutdown_timeout_seconds: 600,
  zoning_wait_minutes: 30,
}

function stubSubmitResponse() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ recovery_app_policies: [powerPolicy] }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function submittedBody(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit
  return JSON.parse(init.body as string) as Record<string, unknown>
}

function fillRequiredCreateFields() {
  fireEvent.change(screen.getByLabelText('Policy ID'), { target: { value: 'power-daily' } })
  fireEvent.change(screen.getByLabelText('Policy name'), { target: { value: 'Power daily' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Daily' } })
  fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'high' } })
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
  it('starts both intervals at one day and clears only the changed unit pair', () => {
    renderModal()
    for (const label of ['Frequency', 'Retention']) {
      const input = screen.getByLabelText(label)
      const unit = screen.getByLabelText(`${label} unit`)
      expect(input).toHaveValue(1)
      expect(unit).toHaveValue('days')
      for (const next of ['minutes', 'hours', 'days']) {
        fireEvent.change(unit, { target: { value: next } })
        expect(input).toHaveValue(null)
        expect(input).toHaveAttribute('min', next === 'minutes' ? '15' : '1')
        expect(input).toHaveAttribute('step', next === 'minutes' ? '15' : '1')
        expect(input).not.toHaveAttribute('max')
        fireEvent.change(input, { target: { value: '30' } })
        fireEvent.change(unit, { target: { value: next } })
        expect(input).toHaveValue(30)
      }
    }
    expect(screen.getByLabelText('Frequency')).toHaveValue(30)
    expect(screen.getByLabelText('Zoning wait (minutes)')).toHaveAttribute('step', '1')
  })

  it.each(['Frequency', 'Retention'])('blocks invalid minute %s on save and Enter', label => {
    const fetchMock = stubSubmitResponse()
    renderModal({ policy })
    const input = screen.getByLabelText(label)
    fireEvent.change(screen.getByLabelText(`${label} unit`), { target: { value: 'minutes' } })
    for (const value of ['', ' ', '0', '-15', '1.5', '1', '7', '20', 'invalid', 'Infinity']) {
      fireEvent.change(input, { target: { value } })
      fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
      expect(input).toHaveAttribute('aria-invalid', 'true')
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(fetchMock).not.toHaveBeenCalled()
    }
  })

  it.each([15, 30, 45, 60, 75, 90, 600])('submits minute intervals %s without imposing the backend minimum', async value => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ policy: { ...policy, frequency_unit: 'minutes', frequency_value: value, retention_unit: 'minutes', retention_value: value }, onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ frequency_value: value, frequency_unit: 'minutes', retention_value: value, retention_unit: 'minutes' })
  })

  it('opens legacy invalid minutes without changing values or dirty state', () => {
    const onClose = vi.fn()
    renderModal({ policy: { ...policy, frequency_value: 7, frequency_unit: 'minutes', retention_value: 7, retention_unit: 'minutes' }, onClose })
    expect(screen.getByLabelText('Frequency')).toHaveValue(7)
    expect(screen.getByLabelText('Retention')).toHaveValue(7)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('displays backend interval rejection details without a local fixed minimum', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail: 'Configured recovery interval is too short.' }, { status: 422 })))
    renderModal({ policy: { ...policy, frequency_value: 15, frequency_unit: 'minutes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Configured recovery interval is too short.')
  })

  it.each(['Manual zoning', 'Manual WWPN entry'])('explains ignored IBM Power frequency for %s while retaining its payload', async mode => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ onClose })
    fillRequiredCreateFields()
    const text = 'For IBM Power Recovery Applications in manual mode, the configured frequency is ignored. Recovery is started manually in Airflow. For VMware, the frequency still applies.'
    expect(screen.queryByText(text)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: mode }))
    const info = screen.getByText(text)
    expect(screen.getByLabelText('Retention').compareDocumentPosition(info) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(info.compareDocumentPosition(screen.getByLabelText('Snapshot selection')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Frequency')).toBeEnabled()
    expect(screen.getByLabelText('Frequency unit')).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Frequency unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('checkbox', { name: mode }))
    expect(screen.queryByText(text)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Frequency')).toHaveValue(7)
    fireEvent.click(screen.getByRole('checkbox', { name: mode }))
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ frequency_value: 7, frequency_unit: 'days' })
  })

  it('shows frequency guidance for a stored WWPN mode and keeps it when switching to zoning', () => {
    renderModal({ policy: { ...policy, manual_wwpn_entry: true } })
    const text = /For IBM Power Recovery Applications in manual mode/
    expect(screen.getByText(text)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual zoning' }))
    expect(screen.getByText(text)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual zoning' }))
    expect(screen.queryByText(text)).not.toBeInTheDocument()
  })

  it('starts with both manual modes off and sends an explicit false on create', async () => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ onClose })
    expect(screen.getByRole('checkbox', { name: 'Manual WWPN entry' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Manual zoning' })).not.toBeChecked()
    fillRequiredCreateFields()
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ manual_zoning: false, manual_wwpn_entry: false })
  })

  it.each(['latest', 'time_range', 'exact_time'] as const)('preserves WWPN entry in an unchanged %s edit', async mode => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    const storedPolicy = { ...exactTimePolicy, snapshot_selection_mode: mode, snapshot_max_age_value: 2, snapshot_max_age_unit: 'hours' as const, manual_wwpn_entry: true }
    renderModal({ onClose, policy: storedPolicy })
    expect(screen.getByRole('checkbox', { name: 'Manual WWPN entry' })).toBeChecked()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ manual_zoning: false, manual_wwpn_entry: true, snapshot_selection_mode: mode })
  })

  it('preserves WWPN entry when another edit field changes', async () => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ onClose, policy: { ...policy, manual_wwpn_entry: true } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ description: 'Updated', manual_wwpn_entry: true })
  })

  it('switches manual modes both ways and allows both off without hiding or disabling either', async () => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ onClose })
    fillRequiredCreateFields()
    const zoning = screen.getByRole('checkbox', { name: 'Manual zoning' })
    const wwpn = screen.getByRole('checkbox', { name: 'Manual WWPN entry' })
    fireEvent.click(zoning)
    expect(zoning).toBeChecked()
    expect(wwpn).not.toBeChecked()
    fireEvent.click(wwpn)
    expect(wwpn).toBeChecked()
    expect(zoning).not.toBeChecked()
    fireEvent.click(zoning)
    expect(zoning).toBeChecked()
    expect(wwpn).not.toBeChecked()
    fireEvent.click(zoning)
    expect(zoning).not.toBeChecked()
    for (const control of [zoning, wwpn]) {
      expect(control).toBeVisible()
      expect(control).toBeEnabled()
    }
    fireEvent.click(wwpn)
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ manual_zoning: false, manual_wwpn_entry: true })
  })

  it('blocks an API record with conflicting manual modes until the user corrects it', async () => {
    const fetchMock = stubSubmitResponse()
    const onClose = vi.fn()
    renderModal({ onClose, policy: { ...powerPolicy, manual_wwpn_entry: true } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('Select either manual zoning or manual WWPN entry, or turn both off.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual zoning' }))
    expect(screen.queryByText('Select either manual zoning or manual WWPN entry, or turn both off.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(submittedBody(fetchMock)).toMatchObject({ manual_zoning: false, manual_wwpn_entry: true })
  })

  it('edits an older API record using the generated default for WWPN entry', () => {
    const legacy = { ...policy }
    Reflect.deleteProperty(legacy, 'manual_wwpn_entry')
    renderModal({ policy: RecoveryAppPolicyRecord.parse(legacy) })
    expect(screen.getByRole('checkbox', { name: 'Manual WWPN entry' })).not.toBeChecked()
  })

  it('guards a changed manual mode and resets it after discard and reopen', () => {
    const onClose = vi.fn()
    const { rerender } = renderModal({ onClose, policy: { ...policy, manual_wwpn_entry: true } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual WWPN entry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByRole('checkbox', { name: 'Manual WWPN entry' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onClose).toHaveBeenCalledOnce()
    const client = new QueryClient()
    rerender(<QueryClientProvider client={client}><RecoveryAppPolicyModal open={false} onClose={onClose} existingPolicies={[]} /></QueryClientProvider>)
    rerender(<QueryClientProvider client={client}><RecoveryAppPolicyModal open onClose={onClose} existingPolicies={[]} /></QueryClientProvider>)
    expect(screen.getByRole('checkbox', { name: 'Manual WWPN entry' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Manual zoning' })).not.toBeChecked()
  })

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
    fireEvent.change(screen.getByLabelText('Frequency unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Retention unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Retention'), { target: { value: '1' } })
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
      target_lpar_prefix: 'dr_', manual_zoning: false, manual_wwpn_entry: false, source_shutdown_timeout_seconds: 300, zoning_wait_minutes: 240,
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
      frequency_value: 1, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
      boot_verify: false, snapshot_selection_mode: 'latest', enabled: true,
      target_lpar_prefix: 'dr_', manual_zoning: false, manual_wwpn_entry: false, source_shutdown_timeout_seconds: 300, zoning_wait_minutes: 240,
    })
  })

  it('submits exact-time policies without max-age fields', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      recovery_app_policies: [{
        id: exactTimePolicy.id, name: exactTimePolicy.name, description: exactTimePolicy.description, level: exactTimePolicy.level,
        frequency_value: exactTimePolicy.frequency_value, frequency_unit: exactTimePolicy.frequency_unit,
        retention_value: exactTimePolicy.retention_value, retention_unit: exactTimePolicy.retention_unit,
        boot_verify: exactTimePolicy.boot_verify, snapshot_selection_mode: 'exact_time',
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
      target_lpar_prefix: 'dr_', manual_zoning: false, manual_wwpn_entry: false, source_shutdown_timeout_seconds: 300, zoning_wait_minutes: 240,
    })
  })

  it('prefills edit data and locks the id', () => {
    renderModal({ policy, existingPolicies: [policy] })
    expect(screen.getByRole('heading', { name: 'Edit policy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Policy ID')).toBeDisabled()
    expect(screen.getByLabelText('Snapshot selection')).toHaveValue('latest')
  })

  it('shows the IBM Power recovery section with backend defaults on create', () => {
    renderModal()

    expect(screen.getByRole('heading', { name: 'IBM Power recovery' })).toBeInTheDocument()
    expect(screen.getByText('These settings are used only for IBM Power recovery. VMware recovery ignores them.')).toBeInTheDocument()
    expect(screen.getByLabelText('Target LPAR prefix')).toHaveValue('dr_')
    expect(screen.getByRole('checkbox', { name: 'Manual zoning' })).not.toBeChecked()
    expect(screen.getByLabelText('Source shutdown timeout (seconds)')).toHaveValue(300)
    expect(screen.getByLabelText('Zoning wait (minutes)')).toHaveValue(240)
  })

  it('submits manual zoning and edited IBM Power values on create', async () => {
    const onClose = vi.fn()
    const fetchMock = stubSubmitResponse()
    renderModal({ onClose })

    fillRequiredCreateFields()
    fireEvent.change(screen.getByLabelText('Target LPAR prefix'), { target: { value: 'p8_' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Manual zoning' }))
    fireEvent.change(screen.getByLabelText('Source shutdown timeout (seconds)'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Zoning wait (minutes)'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    expect(submittedBody(fetchMock)).toMatchObject({
      target_lpar_prefix: 'p8_', manual_zoning: true, source_shutdown_timeout_seconds: 120, zoning_wait_minutes: 15,
    })
  })

  it('loads and keeps the stored IBM Power values when editing another field', async () => {
    const onClose = vi.fn()
    const fetchMock = stubSubmitResponse()
    renderModal({ onClose, policy: powerPolicy, existingPolicies: [powerPolicy] })

    expect(screen.getByLabelText('Target LPAR prefix')).toHaveValue('p8.dr-')
    expect(screen.getByRole('checkbox', { name: 'Manual zoning' })).toBeChecked()
    expect(screen.getByLabelText('Source shutdown timeout (seconds)')).toHaveValue(600)
    expect(screen.getByLabelText('Zoning wait (minutes)')).toHaveValue(30)

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated description' } })
    fireEvent.click(screen.getByRole('button', { name: 'Edit policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    expect(submittedBody(fetchMock)).toMatchObject({
      description: 'Updated description',
      target_lpar_prefix: 'p8.dr-', manual_zoning: true, source_shutdown_timeout_seconds: 600, zoning_wait_minutes: 30,
    })
  })

  it('accepts an empty target LPAR prefix', async () => {
    const onClose = vi.fn()
    const fetchMock = stubSubmitResponse()
    renderModal({ onClose })

    fillRequiredCreateFields()
    fireEvent.change(screen.getByLabelText('Target LPAR prefix'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    expect(submittedBody(fetchMock)).toMatchObject({ target_lpar_prefix: '' })
  })

  it.each(['dr prod', 'dr/', 'abcdefghijklm'])('rejects the target LPAR prefix %j', (prefix) => {
    const fetchMock = stubSubmitResponse()
    renderModal()

    fillRequiredCreateFields()
    fireEvent.change(screen.getByLabelText('Target LPAR prefix'), { target: { value: prefix } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))

    expect(screen.getByText('Use up to 12 letters, digits, dots, underscores or hyphens')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['Source shutdown timeout (seconds)', '0'],
    ['Source shutdown timeout (seconds)', '-1'],
    ['Source shutdown timeout (seconds)', '1.5'],
    ['Source shutdown timeout (seconds)', ''],
    ['Zoning wait (minutes)', '0'],
    ['Zoning wait (minutes)', '-1'],
    ['Zoning wait (minutes)', '1.5'],
    ['Zoning wait (minutes)', ''],
  ])('rejects %s = %j', (label, value) => {
    const fetchMock = stubSubmitResponse()
    renderModal()

    fillRequiredCreateFields()
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Create policy' }))

    expect(screen.getByText('Enter a positive whole number')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
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
