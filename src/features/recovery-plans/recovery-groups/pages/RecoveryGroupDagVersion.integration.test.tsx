import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryGroupBuilder } from '../components/RecoveryGroupBuilder'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { useGetGroupDagTemplateVersions } from '@/generated/query/recovery-groups/recovery-groups.gen'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const clients: QueryClient[] = []
afterEach(() => { cleanup(); clients.splice(0).forEach(client => { client.clear() }); vi.unstubAllGlobals() })

function Harness() {
  const { groups, update } = useRecoveryGroups()
  const [error, setError] = useState('')
  const group = groups[0]
  const save = (draft: RecoveryGroupDraft) => { void update(draft.id, draft).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : 'Failed') }) }
  return <>{error ? <p role="alert">{error}</p> : null}{group ? <RecoveryGroupBuilder initialData={group} onCreate={save} onCancel={vi.fn()} /> : null}</>
}

function setup(mode: 'local' | 'existing' | 'managed', catalogError = false, submitStatus = 200) {
  const group = {
    id: 'group', name: 'Group', description: 'Saved group', provider_id_volume: 'source', policy_set_id: 'policy',
    volumes: [{ name: 'VOL', ...(mode === 'existing' ? { auxiliary_name: 'AUX' } : {}) }], dag_template_version: 'v1',
    topology: mode === 'local' ? 'local' : 'metro_mirror',
    ...(mode !== 'local' ? { metro_mirror: { mode, ...(mode === 'existing' ? { consistency_group_id: '9' } : {}) } } : {}),
    orchestration: { pushed: false, provider_id: 'airflow' },
  }
  const fetch = vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    let body: unknown
    let status = 200
    switch (url.pathname) {
      case '/api/get_providers': body = { providers: [
        { id: 'source', name: 'Source', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'target' },
        { id: 'target', name: 'Target', type: 'FLASHCOPY', role: 'target', credentialStatus: 'ok', partnerProviderId: 'source' },
      ] }; break
      case '/api/get_recovery_groups': body = { recovery_groups: [group] }; break
      case '/api/get_policy_sets': body = { policy_sets: [{ id: 'policy', name: 'Policy', description: 'Policy' }] }; break
      case '/api/get_platform_providers': body = { providers: [{ id: 'airflow', name: 'Airflow', type: 'AIRFLOW', credentialStatus: 'ok', role: 'source' }] }; break
      case '/api/get_group_dag_template_versions':
        status = catalogError ? 503 : 200
        body = catalogError ? { detail: 'Catalog offline' } : { templates: [
          { platform: 'hitachi', version: 'other', default: true, description: 'Other platform' },
          { platform: 'flashcopy', version: 'v1', default: false, description: 'Saved explicit version' },
          { platform: 'flashcopy', version: 'future', default: true, description: 'Current backend default' },
        ] }; break
      case '/api/submit_recovery_group':
        status = submitStatus
        if (status !== 200) body = { detail: 'Backend rejected the version' }
        else {
          if (typeof init?.body !== 'string') throw new Error('Expected JSON body')
          body = { recovery_groups: [{ ...JSON.parse(init.body), orchestration: group.orchestration }] }
        }
        break
      default: throw new Error(`Unexpected API ${url.pathname}`)
    }
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
  })
  vi.stubGlobal('fetch', fetch)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } })
  clients.push(client)
  render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>)
  return fetch
}

describe('Recovery Group DAG version wire integration', () => {
  it('isolates platform query data from a late response and never fetches without a known platform', async () => {
    let finishFlashcopy: ((response: Response) => void) | undefined
    const pending = new Promise<Response>(resolve => { finishFlashcopy = resolve })
    const response = (platform: string) => new Response(JSON.stringify({ templates: [
      { platform, version: 'v1', default: true, description: platform },
    ] }), { headers: { 'Content-Type': 'application/json' } })
    const fetch = vi.fn((input: string) => input.includes('platform=flashcopy') ? pending : Promise.resolve(response('hitachi')))
    vi.stubGlobal('fetch', fetch)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    clients.push(client)
    const initialProps: { platform: string | undefined } = { platform: undefined }
    const { result, rerender } = renderHook(({ platform }: { platform: string | undefined }) => useGetGroupDagTemplateVersions(
      platform ? { platform } : undefined, { query: { enabled: Boolean(platform) } },
    ), { initialProps, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> })
    expect(fetch).not.toHaveBeenCalled()
    rerender({ platform: 'flashcopy' })
    await waitFor(() => { expect(fetch).toHaveBeenCalledOnce() })
    rerender({ platform: 'hitachi' })
    await waitFor(() => { expect(result.current.data?.templates[0]?.platform).toBe('hitachi') })
    await act(async () => { finishFlashcopy?.(response('flashcopy')); await pending })
    expect(result.current.data?.templates[0]?.platform).toBe('hitachi')
    expect(fetch.mock.calls.map(([input]) => new URL(input, 'http://localhost').searchParams.get('platform'))).toEqual(['flashcopy', 'hitachi'])
  })
  it.each(['local', 'existing', 'managed'] as const)('saves an explicit version or the backend default through the real %s builder and client', async mode => {
    const fetch = setup(mode)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Orchestration' }))
    const select = await screen.findByLabelText('DAG Template Version')
    await waitFor(() => { expect(select).toBeEnabled() })
    expect(select).toHaveValue('v1')
    expect(screen.queryByRole('option', { name: 'other (default)' })).not.toBeInTheDocument()
    await user.selectOptions(select, 'future')
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    await waitFor(() => { expect(fetch.mock.calls.some(([input]) => input.includes('/submit_recovery_group'))).toBe(true) })
    const body = fetch.mock.calls.find(([input]) => input.includes('/submit_recovery_group'))?.[1]?.body
    if (typeof body !== 'string') throw new Error('Expected submitted JSON')
    expect(JSON.parse(body)).toMatchObject({ dag_template_version: null, provider_id_volume: 'source',
      volumes: [{ name: 'VOL', ...(mode === 'existing' ? { auxiliary_name: 'AUX' } : {}) }] })
    const catalogRequests = fetch.mock.calls.filter(([input]) => input.includes('/get_group_dag_template_versions'))
    expect(catalogRequests).toHaveLength(1)
    expect(catalogRequests[0]?.[0]).toContain('platform=flashcopy')
  })

  it('keeps Save available during a catalog failure and lets the backend reject a version', async () => {
    const fetch = setup('local', true, 400)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Orchestration' }))
    await screen.findByText('DAG versions could not be loaded.')
    expect(screen.getByLabelText('DAG Template Version')).toHaveValue('v1')
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    await screen.findByText(/Backend rejected the version/)
    expect(fetch.mock.calls.filter(([input]) => input.includes('/submit_recovery_group'))).toHaveLength(1)
    expect(fetch.mock.calls.filter(([input]) => input.includes('/get_recovery_groups'))).toHaveLength(1)
  })
})
