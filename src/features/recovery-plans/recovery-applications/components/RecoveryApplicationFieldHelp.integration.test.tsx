import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from '../pages/RecoveryApplicationBuilderPage'
import { RecoveryApplicationEditorPage } from '../pages/RecoveryApplicationEditorPage'
import { getGetRecoveryGroupsQueryKey } from '@/generated/query/recovery-groups/recovery-groups.gen'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => vi.fn(), useParams: () => ({ id: 'Finance' }),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const clients: QueryClient[] = []
afterEach(() => { clients.forEach(client => { client.clear() }); clients.length = 0; vi.unstubAllGlobals() })

function setup(power = false, version: string | null = null, pushed = false) {
  const source = power ? 'hmc' : 'vcenter'
  const providers = [
    { id: 'vcenter', name: 'Source vCenter', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
    { id: 'target', name: 'Target vCenter', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
    { id: 'hmc', name: 'HMC', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
  ]
  const group = { id: 'group', name: 'Database group', provider_id_vm: source, provider_id_volume: '',
    vms: [{ name: 'db' }], volumes: [], topology: 'local',
    orchestration: { pushed: true, run_id: 'group-run', provider_id: 'airflow' } }
  const tier = { order: 1, description: 'Database', recovery_group: { id: 'group', name: 'Database group', vms: [{ name: 'db' }] } }
  const application: RecoveryApplicationData = { id: 'Finance', policy_set_id: 'policy', application: {
    name: 'Finance', description: 'Recovery', environment: 'prod', platform: power ? 'IBM_POWER' : 'VMWARE',
    source_provider_id: source, target_provider_id: power ? source : 'target', notificationEmail: 'stored@example.test',
    dag_template_version: version, tiers: { first: tier },
  } }
  let records = [{ ...application, orchestration: { pushed, run_id: 'app-run', provider_id: 'airflow' } }]
  const requests: { path: string; method: string; body?: RecoveryApplicationData; params: URLSearchParams }[] = []
  vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as RecoveryApplicationData : undefined
    const method = init?.method ?? 'GET'
    requests.push({ path: url.pathname, method, ...(body ? { body } : {}), params: url.searchParams })
    let data: unknown
    switch (url.pathname) {
      case '/api/get_providers': data = { providers }; break
      case '/api/get_platform_providers': data = { providers: [{ id: 'airflow', name: 'Airflow', type: 'AIRFLOW', credentialStatus: 'ok', port: 8080 }] }; break
      case '/api/get_policy_sets': data = { policy_sets: [{ id: 'policy', name: 'Policy', description: 'Recovery policy' }] }; break
      case '/api/get_recovery_groups': data = { recovery_groups: [group] }; break
      case '/api/get_recovery_apps': data = { applications: records }; break
      case '/api/get_dag_template_versions': data = { templates: [
        { platform: power ? 'ibm_power' : 'vmware', version: 'v1', default: true, description: 'Default' },
        ...(power ? [{ platform: 'ibm_power', version: 'v2', default: false, description: 'Power v2' }] : []),
      ] }; break
      case '/api/submit_recovery_dag': {
        if (!body) throw new Error('Missing submit body')
        const push = url.searchParams.get('push_to_orchestrator') === 'true'
        records = [{ ...body, orchestration: { pushed: push, run_id: 'app-run', provider_id: 'airflow' } }]
        data = { applications: records, ...(push ? { orchestrator_push: { status: 'pushed', dag_id: 'app-run', dag: '/mock/dag.py' } } : {}) }
        break
      }
      case '/api/get_policies': data = { policies: [] }; break
      case '/api/get_recovery_app_policies': data = { recovery_app_policies: [] }; break
      case '/api/get_clean_room_policies': data = { clean_room_policies: [] }; break
      default: throw new Error(`Unexpected HTTP request: ${method} ${url.pathname}`)
    }
    const response = new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    return Promise.resolve(response)
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  clients.push(client)
  return { client, application, requests,
    mount: (create = false) => render(<QueryClientProvider client={client}>{create ? <RecoveryApplicationBuilderPage /> : <RecoveryApplicationEditorPage />}</QueryClientProvider>) }
}

async function ready() {
  await waitFor(() => { expect(screen.getByLabelText('Notification email')).toBeEnabled() })
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toBeEnabled() })
}

async function inspectHelp() {
  const user = userEvent.setup()
  const triggers = screen.getAllByRole('button', { name: /^About / })
  for (const trigger of triggers) {
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Tab}{Shift>}{Tab}{/Shift}{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
  return triggers.length
}

describe('technical help through the real wizard and HTTP boundary', () => {
  it.each([false, true])('preserves the exact Edit payload after all nine helpers (Power=%s)', async power => {
    const fixture = setup(power)
    const expected = structuredClone(fixture.application)
    const user = userEvent.setup()
    fixture.mount()
    await ready()
    expect(await inspectHelp()).toBe(3)
    await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
    expect(await inspectHelp()).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Policy set' }))
    expect(await inspectHelp()).toBe(1)
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('switch', { name: 'Push to orchestrator' }))
    await user.selectOptions(screen.getByLabelText('Airflow provider *'), 'airflow')
    expect(await inspectHelp()).toBe(3)
    expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    await waitFor(() => { expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(1) })
    const submitted = fixture.requests.find(request => request.method === 'POST')
    expect(submitted?.path).toBe('/api/submit_recovery_dag')
    expect(submitted?.body).toEqual(expected)
    expect(submitted?.params.get('push_to_orchestrator')).toBe('true')
    expect(submitted?.params.get('provider_id')).toBe('airflow')
  })

  it.each([false, true])('allows Create help without changing selected values (Power=%s)', async power => {
    const fixture = setup(power)
    const user = userEvent.setup()
    fixture.mount(true)
    await screen.findByLabelText('Application Name *')
    await user.type(screen.getByLabelText('ID *'), 'NewApp')
    await user.type(screen.getByLabelText('Application Name *'), 'NewApp')
    await user.type(screen.getByLabelText('Description *'), 'Recovery')
    await screen.findByRole('option', { name: power ? /^HMC - IBM_POWER$/ : /Source vCenter/ })
    await user.selectOptions(screen.getByLabelText('Provider ID *'), power ? 'hmc' : 'vcenter')
    await user.selectOptions(screen.getByLabelText('Target provider ID *'), power ? 'hmc' : 'target')
    expect(await inspectHelp()).toBe(3)
    await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
    await waitFor(() => { expect(fixture.client.getQueryData(getGetRecoveryGroupsQueryKey())).toBeDefined() })
    fireEvent.drop(screen.getByLabelText('Unassigned recovery group'), { dataTransfer: { getData: () => 'group' } })
    expect(await inspectHelp()).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Policy set' }))
    await user.click(await screen.findByText('Policy', { exact: true }))
    await inspectHelp()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(await inspectHelp()).toBe(2)
    expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    await waitFor(() => { expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(1) })
    const submitted = fixture.requests.find(request => request.method === 'POST')
    expect(submitted?.params.get('push_to_orchestrator')).toBe('false')
    expect(submitted?.body?.application).toMatchObject({ source_provider_id: power ? 'hmc' : 'vcenter', target_provider_id: power ? 'hmc' : 'target', notificationEmail: null, dag_template_version: null })
  })

  it.each([false, true])('lets pushed applications inspect help without a write request (Power=%s)', async power => {
    const fixture = setup(power, power ? 'v2' : null, true)
    const user = userEvent.setup()
    fixture.mount()
    await waitFor(() => { expect(screen.getByLabelText('Application Name *')).toHaveValue('Finance') })
    for (const step of ['Application details', 'Recovery groups & tiers', 'Policy set', 'Orchestration']) {
      await user.click(screen.getByRole('button', { name: step }))
      await inspectHelp()
      for (const control of [...screen.queryAllByRole('textbox'), ...screen.queryAllByRole('combobox'), ...screen.queryAllByRole('switch'), ...screen.queryAllByRole('checkbox')]) expect(control).toBeDisabled()
    }
    expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    expect(fixture.requests.filter(request => request.method !== 'GET')).toHaveLength(0)
  })
})
