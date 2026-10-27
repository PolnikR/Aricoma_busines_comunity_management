import { useState } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async importOriginal => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'Finance' }),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({ data: [{ id: 'airflow-02', type: 'AIRFLOW', name: 'Orchestrator' }] }),
}))
vi.mock('@/generated/query/providers/providers.gen', async importOriginal => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({ data: [
    { id: 'source', type: 'VMWARE', role: 'source' },
    { id: 'target', type: 'VMWARE', role: 'target' },
  ] }),
}))
vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: function StatefulBuilder({ initialData, readOnly, onDirtyChange }: {
    initialData: RecoveryApplicationFormState
    readOnly: boolean
    onDirtyChange: (dirty: boolean) => void
  }) {
    const [name, setName] = useState(initialData.name)
    return <input aria-label="Application name" disabled={readOnly} value={name} onChange={event => {
      setName(event.target.value)
      onDirtyChange(true)
    }} />
  },
}))

function response(name: string) {
  return { applications: [{
    id: 'Finance.json',
    application: { name, description: 'Recovery', environment: 'prod', platform: 'VMWARE', source_provider_id: 'source', target_provider_id: 'target', tiers: {} },
    orchestration: { pushed: false, provider_id: 'airflow-02', run_id: 'retained-run' },
  }] }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('initializes the verified server snapshot once and preserves later dirty edits through refresh', async () => {
  let finishFresh!: (response: Response) => void
  const fresh = new Promise<Response>(resolve => { finishFresh = resolve })
  const fetchMock = vi.fn().mockReturnValueOnce(fresh)
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(response('later server state')), { status: 200 })))
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(getGetRecoveryAppsQueryKey(), response('stale cached state'))
  const { unmount } = render(<QueryClientProvider client={client}><RecoveryApplicationEditorPage /></QueryClientProvider>)
  const input = () => screen.getByRole('textbox', { name: 'Application name' })
  expect(input()).toHaveValue('stale cached state')
  expect(input()).toBeDisabled()
  await waitFor(() => { expect(fetchMock).toHaveBeenCalledOnce() })
  await act(async () => {
    finishFresh(new Response(JSON.stringify(response('fresh verified state')), { status: 200 }))
    await fresh
  })
  await waitFor(() => { expect(input()).toHaveValue('fresh verified state') })
  expect(input()).toBeEnabled()
  const user = userEvent.setup()
  await user.clear(input())
  await user.type(input(), 'my unsaved edits')
  await act(async () => { await client.invalidateQueries({ queryKey: getGetRecoveryAppsQueryKey() }) })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(client.getQueryData(getGetRecoveryAppsQueryKey())).toMatchObject({ applications: [{ application: { name: 'later server state' } }] })
  expect(input()).toHaveValue('my unsaved edits')
  unmount()
  client.clear()
})
