import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
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

function setup(power = false, version: string | null = null, duplicate = false, pushed = false,
  groupCase?: { topology: 'local' | 'metro_mirror'; mode?: 'managed' | 'existing'; computeSource?: string }) {
  const source = power ? 'hmc' : 'vcenter'
  const providers = [
    { id: 'vcenter', name: 'Source vCenter', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
    { id: 'target', name: 'Target vCenter', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
    { id: 'hmc', name: 'HMC', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
    { id: 'hmc-other', name: 'Another HMC', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
    { id: 'flash-source', name: 'Primary FlashSystem', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'flash-auxiliary' },
    { id: 'flash-auxiliary', name: 'Auxiliary FlashSystem', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'flash-source' },
  ]
  const group = { id: 'group', name: 'Database group', provider_id_vm: groupCase?.computeSource ?? source,
    provider_id_volume: groupCase ? 'flash-source' : '',
    vms: [{ name: 'db' }],
    volumes: groupCase ? [{ name: 'VOL', ...(groupCase.mode === 'existing' ? { auxiliary_name: 'AUX-VOL' } : {}) }] : [],
    topology: groupCase?.topology ?? 'local',
    ...(groupCase?.topology === 'metro_mirror' ? { metro_mirror: { mode: groupCase.mode ?? 'existing',
      ...(groupCase.mode === 'existing' ? { consistency_group_id: '001' } : {}) } } : {}),
    orchestration: { pushed: true, run_id: 'group-run', provider_id: 'airflow' } }
  const tier = { order: 1, description: 'Database', recovery_group: { id: 'group', name: 'Database group', vms: [{ name: 'db' }] } }
  const application: RecoveryApplicationData = { id: 'Finance', policy_set_id: 'policy', application: {
    name: 'Finance', description: 'Recovery', environment: 'prod', platform: power ? 'IBM_POWER' : 'VMWARE',
    source_provider_id: source, target_provider_id: power ? source : 'target', notificationEmail: 'stored@example.test',
    dag_template_version: version, tiers: { first: tier, ...(duplicate ? { second: { ...tier, order: 2 } } : {}) },
  } }
  let records = [{ ...application, orchestration: { pushed, run_id: 'app-run', provider_id: 'airflow' } }]
  const requests: { path: string; method: string; body?: RecoveryApplicationData; params: URLSearchParams }[] = []
  let groupFailure = false
  let submitGate: Promise<void> | undefined
  vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) as RecoveryApplicationData : undefined
    const method = init?.method ?? 'GET'
    requests.push({ path: url.pathname, method, ...(body ? { body } : {}), params: url.searchParams })
    let data: unknown
    let status = 200
    switch (url.pathname) {
      case '/api/get_providers': data = { providers }; break
      case '/api/get_platform_providers': data = { providers: [{ id: 'airflow', name: 'Airflow', type: 'AIRFLOW', credentialStatus: 'ok', port: 8080 }] }; break
      case '/api/get_policy_sets': data = { policy_sets: [{ id: 'policy', name: 'Policy', description: 'Recovery policy' }] }; break
      case '/api/get_recovery_groups': data = groupFailure ? { detail: 'Groups offline' } : { recovery_groups: [group] }; status = groupFailure ? 503 : 200; break
      case '/api/get_recovery_apps': data = { applications: records }; break
      case '/api/get_dag_template_versions': data = { templates: [
        { platform: power ? 'ibm_power' : 'vmware', version: 'v1', default: true, description: 'Default' },
        ...(['v2', ...(power ? ['v3'] : [])].map(version => ({ platform: power ? 'ibm_power' : 'vmware', version, default: false, description: version }))),
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
    const response = new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    return url.pathname === '/api/submit_recovery_dag' && submitGate ? submitGate.then(() => response) : Promise.resolve(response)
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  clients.push(client)
  return { client, application, group, requests, failGroups: () => { groupFailure = true },
    holdSubmit: () => {
      let release: () => void = () => { throw new Error('Submit gate was not initialized') }
      submitGate = new Promise<void>(resolve => { release = resolve })
      return release
    },
    mount: (create = false) => render(<QueryClientProvider client={client}>{create ? <RecoveryApplicationBuilderPage /> : <RecoveryApplicationEditorPage />}</QueryClientProvider>) }
}

async function ready() {
  await waitFor(() => { expect(screen.getByLabelText('Notification email')).toBeEnabled() })
  await waitFor(() => { expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toBeEnabled() })
}

describe('real wizard to HTTP functional consistency', () => {
  it('sends only one POST while a real save mutation is pending', async () => {
    const fixture = setup()
    const release = fixture.holdSubmit()
    const user = userEvent.setup()
    fixture.mount()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    const save = screen.getByRole('button', { name: 'Save Application' })
    try {
      await user.dblClick(save)
      await waitFor(() => { expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(1) })
      expect(save).toBeDisabled()
    } finally {
      release()
    }
    await waitFor(() => { expect(save).toBeEnabled() })
  })

  it.each([false, true])('creates, saves and reopens the email and selected workloads (Power=%s)', async power => {
    const fixture = setup(power)
    const user = userEvent.setup()
    const view = fixture.mount(true)
    fireEvent.change(screen.getByLabelText('ID *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Recovery' } })
    await screen.findByRole('option', { name: power ? /^HMC - IBM_POWER$/ : /Source vCenter/ })
    await user.selectOptions(screen.getByLabelText('Provider ID *'), power ? 'hmc' : 'vcenter')
    await user.selectOptions(screen.getByLabelText('Target provider ID *'), power ? 'hmc' : 'target')
    await user.type(screen.getByLabelText('Notification email'), 'Team@Example.test')
    await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
    await waitFor(() => { expect(fixture.client.getQueryData(getGetRecoveryGroupsQueryKey())).toBeDefined() })
    fireEvent.drop(screen.getByLabelText('Unassigned recovery group'), { dataTransfer: { getData: () => 'group' } })
    await user.click(screen.getByRole('button', { name: 'Policy set' }))
    await user.click(await screen.findByText('Policy', { exact: true }))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    const before = fixture.requests.length
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    await waitFor(() => { expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(1) })
    expect(fixture.requests[before]?.method).toBe('POST')
    expect(fixture.requests[before]?.body?.application).toMatchObject({ notificationEmail: 'Team@Example.test', source_provider_id: power ? 'hmc' : 'vcenter', target_provider_id: power ? 'hmc' : 'target', dag_template_version: null })
    const submitted = fixture.requests[before]?.body
    if (!submitted) throw new Error('Expected submitted application')
    expect(Object.values(submitted.application.tiers)[0]?.recovery_group.vms).toEqual([{ name: 'db', order: 1 }])
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled() })
    view.unmount()
    fixture.mount()
    await ready()
    expect(screen.getByLabelText('Notification email')).toHaveValue('Team@Example.test')
    await user.clear(screen.getByLabelText('Notification email'))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    await waitFor(() => { expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(2) })
    expect(fixture.requests.filter(req => req.method === 'POST')[1]?.body?.application.notificationEmail).toBeNull()
  })

  it.each([[false, null], [false, 'v2'], [true, null], [true, 'v1'], [true, 'v2'], [true, 'v3']] as const)('preserves template-specific duplicate behavior on Push (Power=%s, version=%s)', async (power, version) => {
    const fixture = setup(power, version, true)
    const user = userEvent.setup()
    fixture.mount()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('switch'))
    await user.selectOptions(screen.getByLabelText('Airflow provider *'), 'airflow')
    const save = screen.getByRole('button', { name: 'Save Application' })
    if (version === 'v2' || version === 'v3') {
      expect(save).toBeDisabled()
      expect(screen.getByRole('alert')).toHaveTextContent('workload "db" in only one tier; it appears in first, second')
      await user.click(save)
      expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(0)
      await user.selectOptions(screen.getByLabelText('DAG Template Version'), 'v1')
    }
    await waitFor(() => { expect(save).toBeEnabled() })
    const before = fixture.requests.length
    await user.click(save)
    await waitFor(() => { expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(1) })
    expect(fixture.requests[before]?.method).toBe('POST')
    expect(fixture.requests[before]?.params.get('push_to_orchestrator')).toBe('true')
    expect(fixture.requests[before]?.body?.application.dag_template_version).toBe(version === 'v2' || version === 'v3' ? null : version)
  })

  it.each(['email', 'source', 'membership', 'query-error'] as const)('blocks %s before HTTP submit using current query data', async problem => {
    const fixture = setup()
    const user = userEvent.setup()
    fixture.mount()
    await ready()
    if (problem === 'email') await user.type(screen.getByLabelText('Notification email'), ' invalid')
    else if (problem === 'query-error') {
      fixture.failGroups()
      await act(async () => { await fixture.client.invalidateQueries({ queryKey: getGetRecoveryGroupsQueryKey() }) })
    } else {
      act(() => { fixture.client.setQueryData(getGetRecoveryGroupsQueryKey(), { recovery_groups: [{ ...fixture.group, ...(problem === 'source' ? { provider_id_vm: 'target' } : { vms: [] }) }] }) })
    }
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Orchestration' })).toBeDisabled() })
    if (problem !== 'email') await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(0)
  })

  it('keeps a pushed email disabled while every step remains inspectable', async () => {
    const fixture = setup(true, 'v2', true, true)
    const user = userEvent.setup()
    fixture.mount()
    await screen.findByLabelText('Notification email')
    await waitFor(() => { expect(screen.getByLabelText('Notification email')).toHaveValue('stored@example.test') })
    expect(screen.getByLabelText('Notification email')).toBeDisabled()
    for (const name of ['Recovery groups & tiers', 'Policy set', 'Orchestration']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    expect(fixture.requests.filter(req => req.method === 'POST')).toHaveLength(0)
  })

  // F2 regression: compute source identity is independent of Local/Metro Mirror
  // storage topology. Test the real GET -> mapper -> sidebar -> Save boundary.
  it.each([
    { power: false, topology: 'local', mode: null },
    { power: false, topology: 'metro_mirror', mode: 'managed' },
    { power: false, topology: 'metro_mirror', mode: 'existing' },
    { power: true, topology: 'local', mode: null },
    { power: true, topology: 'metro_mirror', mode: 'managed' },
    { power: true, topology: 'metro_mirror', mode: 'existing' },
  ] as const)('filters source correctly for $topology/$mode (Power=$power)', async ({ power, topology, mode }) => {
    const user = userEvent.setup()
    for (const wrongSource of [false, true]) {
      const computeSource = wrongSource ? power ? 'hmc-other' : 'target' : undefined
      const fixture = setup(power, null, false, false, {
        topology, ...(mode ? { mode } : {}), ...(computeSource ? { computeSource } : {}),
      })
      const view = fixture.mount()
      try {
        await ready()
        await waitFor(() => { expect(fixture.client.getQueryData(getGetRecoveryGroupsQueryKey())).toBeDefined() })
        await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
        const orchestration = screen.getByRole('button', { name: 'Orchestration' })
        if (wrongSource) {
          expect(screen.getByText('No recovery groups are available')).toBeInTheDocument()
          expect(orchestration).toBeDisabled()
          expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(0)
        } else {
          expect(screen.queryByText('No recovery groups are available')).not.toBeInTheDocument()
          expect(orchestration).toBeEnabled()
          await user.click(orchestration)
          const before = fixture.requests.length
          await user.click(screen.getByRole('button', { name: 'Save Application' }))
          await waitFor(() => { expect(fixture.requests.filter(request => request.method === 'POST')).toHaveLength(1) })
          expect(fixture.requests[before]?.path).toBe('/api/submit_recovery_dag')
          expect(fixture.requests[before]?.body?.application.source_provider_id).toBe(power ? 'hmc' : 'vcenter')
          expect(fixture.requests[before]?.body?.application.tiers['first']?.recovery_group.id).toBe('group')
        }
      } finally {
        view.unmount()
      }
    }
  })

})
