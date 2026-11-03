import type { ReactNode } from 'react'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryAppsResponse, RecoveryGroupsResponse } from '@/generated/query/zod'
import { RecoveryAppRecord, RecoveryGroupRecord } from '@/generated/query/zod'
import { STANDARD_QUERY_OPTIONS, STANDARD_STALE_TIME_MS } from '@/shared/query/cachePolicy'
import { useRecoveryGroups } from '../../recovery-groups/hooks/useRecoveryGroups'
import { useSubmitRecoveryApplication } from '../../recovery-applications/hooks/useRecoveryApplications'
import { useDeleteRecoveryApplication } from '../../recovery-applications/hooks/useDeleteRecoveryApplication'
import { PolicySetUsage } from './PolicySetUsage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const group = { id: 'group', name: 'Database', policy_set_id: 'set', provider_id_vm: 'source', provider_id_volume: 'storage', vms: [{ name: 'VM' }], volumes: [] }
const app = { id: 'app', policy_set_id: 'set', application: { name: 'Finance', description: '', environment: 'prod', platform: 'VMWARE', source_provider_id: 'source', target_provider_id: 'target', notificationEmail: null, tiers: {} } }
const groupsKey = ['/get_recovery_groups']
const appsKey = ['/get_recovery_apps']
function client() { return new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false }, mutations: { retry: false } } }) }
function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
  }
}
function wire(options: { appSubmitGate?: Promise<void> } = {}) {
  let groups: RecoveryGroupsResponse['recovery_groups'] = [group]
  let applications: RecoveryAppsResponse['applications'] = [app]
  const providers = [
    { id: 'source', name: 'Source', type: 'VMWARE', role: 'source', ipAddress: '127.0.0.1', credentialStatus: 'ok' },
    { id: 'storage', name: 'Storage', type: 'FLASHCOPY', role: 'source', ipAddress: '127.0.0.1', credentialStatus: 'ok', partnerProviderId: 'storage-target' },
    { id: 'storage-target', name: 'Target storage', type: 'FLASHCOPY', role: 'target', ipAddress: '127.0.0.1', credentialStatus: 'ok', partnerProviderId: 'storage' },
  ]
  const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>((input, init) => {
    const url = new URL(input, 'http://localhost')
    let data: unknown
    switch (url.pathname) {
      case '/api/get_recovery_groups': data = { recovery_groups: groups }; break
      case '/api/get_recovery_apps': data = { applications }; break
      case '/api/get_providers': data = { providers }; break
      case '/api/submit_recovery_group': {
        if (typeof init?.body !== 'string') throw new Error('Expected serialized group body')
        const submitted = RecoveryGroupRecord.parse(JSON.parse(init.body))
        groups = [...groups.filter(item => item.id !== submitted.id), submitted]
        data = { recovery_groups: groups }; break
      }
      case '/api/delete_recovery_group': groups = groups.filter(item => item.id !== url.searchParams.get('recovery_group_id')); data = { recovery_groups: groups }; break
      case '/api/submit_recovery_dag': {
        if (typeof init?.body !== 'string') throw new Error('Expected serialized app body')
        const submitted = RecoveryAppRecord.parse(JSON.parse(init.body))
        applications = [...applications.filter(item => item.id !== submitted.id), submitted]
        data = { applications }; break
      }
      case '/api/delete_recovery_app': applications = applications.filter(item => item.id !== url.searchParams.get('recovery_app_id')); data = { applications }; break
      default: throw new Error(`Unexpected request ${url.pathname}`)
    }
    const response = new Response(JSON.stringify(data), { status: 200 })
    return url.pathname === '/api/submit_recovery_dag' && options.appSubmitGate
      ? options.appSubmitGate.then(() => response) : Promise.resolve(response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return {
    fetchMock,
    count: (path: string) => fetchMock.mock.calls.filter(([url]) => url.includes(`/api/${path}`)).length,
  }
}
afterEach(() => { vi.unstubAllGlobals() })

describe('PolicySetUsage shared cache', () => {
  it.each([false, true])('uses fresh raw cache without GET, empty=%s', async empty => {
    const queryClient = client(), { fetchMock } = wire()
    queryClient.setQueryData(groupsKey, { recovery_groups: empty ? [] : [group] })
    queryClient.setQueryData(appsKey, { applications: empty ? [] : [app] })
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrapper(queryClient) })
    if (empty) expect(screen.getByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).toBeVisible()
    else expect(screen.getByRole('link', { name: 'Open detail: Database' })).toBeVisible()
    await act(async () => { await Promise.resolve() })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(groupsKey)).toHaveProperty('recovery_groups')
    expect(queryClient.getQueryData(appsKey)).toHaveProperty('applications')
  })

  it.each([
    { groups: true, apps: false, stale: false, expected: 1 },
    { groups: false, apps: true, stale: false, expected: 1 },
    { groups: false, apps: false, stale: false, expected: 2 },
    { groups: true, apps: true, stale: true, expected: 2 },
  ])('fetches only missing or expired collections: %j', async scenario => {
    const queryClient = client(), { fetchMock } = wire()
    const options = { updatedAt: Date.now() - (scenario.stale ? STANDARD_STALE_TIME_MS + 1 : 0) }
    if (scenario.groups) queryClient.setQueryData(groupsKey, { recovery_groups: [group] }, options)
    if (scenario.apps) queryClient.setQueryData(appsKey, { applications: [app] }, options)
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrapper(queryClient) })
    await screen.findByRole('link', { name: 'Open detail: Finance' })
    await waitFor(() => { expect(queryClient.isFetching()).toBe(0) })
    expect(fetchMock).toHaveBeenCalledTimes(scenario.expected)
  })

  it('shares fresh collections across set changes and remounts, then respects invalidation before TTL', async () => {
    const queryClient = client(), { count } = wire()
    const view = render(<PolicySetUsage policySetId="set" />, { wrapper: wrapper(queryClient) })
    await screen.findByRole('link', { name: 'Open detail: Finance' })
    view.rerender(<PolicySetUsage policySetId="other" />)
    expect(screen.getByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).toBeVisible()
    view.unmount()
    await queryClient.invalidateQueries({ queryKey: groupsKey })
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrapper(queryClient) })
    await waitFor(() => { expect(queryClient.isFetching()).toBe(0) })
    expect(count('get_recovery_groups')).toBe(2)
    expect(count('get_recovery_apps')).toBe(1)
    expect(count('get_providers')).toBe(0)
  })

  it('reflects real group create, reassignment and delete through existing invalidation', async () => {
    const queryClient = client()
    wire()
    const wrap = wrapper(queryClient)
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrap })
    const mutations = renderHook(() => useRecoveryGroups(), { wrapper: wrap })
    await waitFor(() => { expect(mutations.result.current.groups).toHaveLength(1) })
    const draft = { id: 'created', name: 'Created group', description: 'Created group description', sourceCategory: 'backup_system_workload' as const, workloadType: 'vmware_virtual_machines' as const,
      resourceType: 'vm' as const, providerId: 'source', policySetId: 'set', resources: ['VM'], topology: 'local' as const,
      relatedVolumeProviderId: 'storage', relatedVolumes: [], orchestrationProviderId: 'airflow', pushToOrchestrator: false }
    await act(async () => { await mutations.result.current.create(draft) })
    expect(await screen.findByRole('link', { name: 'Open detail: Created group' })).toBeVisible()
    await act(async () => { await mutations.result.current.update('created', { ...draft, policySetId: 'other' }) })
    await waitFor(() => { expect(screen.queryByRole('link', { name: 'Open detail: Created group' })).not.toBeInTheDocument() })
    await act(async () => { await mutations.result.current.update('created', draft) })
    await screen.findByRole('link', { name: 'Open detail: Created group' })
    const created = mutations.result.current.groups.find(item => item.id === 'created')
    if (!created) throw new Error('Expected created group')
    await act(async () => { await mutations.result.current.remove(created) })
    await waitFor(() => { expect(screen.queryByRole('link', { name: 'Open detail: Created group' })).not.toBeInTheDocument() })
    expect(queryClient.getQueryData(groupsKey)).toHaveProperty('recovery_groups')
  })

  it('reflects real application create/edit/delete including save while Used in is unmounted', async () => {
    const queryClient = client()
    wire()
    const wrap = wrapper(queryClient)
    const view = render(<PolicySetUsage policySetId="set" />, { wrapper: wrap })
    await screen.findByRole('link', { name: 'Open detail: Finance' })
    const mutations = renderHook(() => ({ submit: useSubmitRecoveryApplication(), remove: useDeleteRecoveryApplication() }), { wrapper: wrap })
    const data = { id: 'created', policy_set_id: 'set', application: { ...app.application, name: 'Created app' } }
    await act(async () => { await mutations.result.current.submit.mutateAsync({ providerId: '', data, pushToOrchestrator: false }) })
    expect(await screen.findByRole('link', { name: 'Open detail: Created app' })).toBeVisible()
    view.unmount()
    await act(async () => { await mutations.result.current.submit.mutateAsync({ providerId: '', data: { ...data, policy_set_id: 'other' }, pushToOrchestrator: false }) })
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrap })
    expect(screen.queryByRole('link', { name: 'Open detail: Created app' })).not.toBeInTheDocument()
    await act(async () => { await mutations.result.current.submit.mutateAsync({ providerId: '', data, pushToOrchestrator: false }) })
    await screen.findByRole('link', { name: 'Open detail: Created app' })
    await act(async () => { await mutations.result.current.remove.mutateAsync({ id: data.id, data: { application: data.application } }) })
    await waitFor(() => { expect(screen.queryByRole('link', { name: 'Open detail: Created app' })).not.toBeInTheDocument() })
    expect(queryClient.getQueryData(appsKey)).toHaveProperty('applications')
  })

  it('updates mounted usage when the page that started an application save unmounts before its response', async () => {
    let release: () => void = () => { throw new Error('submit gate not initialized') }
    const gate = new Promise<void>(resolve => { release = resolve })
    const queryClient = client(), { count } = wire({ appSubmitGate: gate })
    const wrap = wrapper(queryClient)
    render(<PolicySetUsage policySetId="set" />, { wrapper: wrap })
    await screen.findByRole('link', { name: 'Open detail: Finance' })
    const submit = renderHook(() => useSubmitRecoveryApplication(), { wrapper: wrap })
    let saved: Promise<unknown> | undefined
    await act(async () => {
      saved = submit.result.current.mutateAsync({ providerId: '', data: { ...app, application: { ...app.application, name: 'Saved after navigation' } }, pushToOrchestrator: false })
      await Promise.resolve()
    })
    await waitFor(() => { expect(count('submit_recovery_dag')).toBe(1) })
    submit.unmount()
    await act(async () => { release(); await saved })
    expect(await screen.findByRole('link', { name: 'Open detail: Saved after navigation' })).toBeVisible()
    expect(queryClient.getQueryData(appsKey)).toHaveProperty('applications')
  })
})
