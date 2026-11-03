import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup, RollbackReport } from '../model/recoveryGroupTypes'
import { RecoveryGroupsTable } from './RecoveryGroupsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({ useGetPolicySets: () => ({ data: [] }) }))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  useGetPlatformProviders: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails', () => ({
  useSelectedOrchestrationDetails: () => null,
}))

const firstId = 'group / A+&?č'
const firstGroup: RecoveryGroup = { id: firstId, name: 'First group', description: '', sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines',
    resourceType: 'vm', providerId: 'source', policySetId: 'set', resources: [], relatedVolumeProviderId: null,
    relatedVolumes: [], resourceCount: 0, status: 'Draft', pushToOrchestrator: true, orchestrationProviderId: 'airflow' }
const groups: RecoveryGroup[] = [firstGroup,
  { id: 'second', name: 'Second group', description: '', sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines',
    resourceType: 'vm', providerId: 'source', policySetId: 'set', resources: [], relatedVolumeProviderId: null,
    relatedVolumes: [], resourceCount: 0, status: 'Draft' },
]

function History() {
  const location = useLocation()
  const navigate = useNavigate()
  return <><output aria-label="Current search">{location.search}</output>
    <output aria-label="Current location">{location.pathname}{location.search}</output>
    <button onClick={() => { void navigate(-1) }}>History back</button>
    <button onClick={() => { void navigate(1) }}>History forward</button>
    <button onClick={() => { void navigate('/elsewhere?leave=yes') }}>Leave list</button></>
}

function renderTable(options: { search?: string; records?: RecoveryGroup[]; isLoading?: boolean; error?: Error | null } = {}) {
  const callbacks = { onEdit: vi.fn<(id: string) => void>(),
    onDelete: vi.fn<(group: RecoveryGroup) => Promise<RollbackReport | null>>().mockResolvedValue(null),
    onRollback: vi.fn<(id: string, providerId: string) => Promise<RollbackReport>>().mockResolvedValue({ status: 'ok' }) }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const content = (loading = options.isLoading ?? false, error = options.error ?? null) => (
    <QueryClientProvider client={client}><MemoryRouter initialEntries={['/previous?previous=yes', `/groups${options.search ?? `?keep=yes&detail=${encodeURIComponent(firstId)}`}`]}>
      <History /><Routes><Route path="/groups" element={<RecoveryGroupsTable groups={options.records ?? groups}
        isLoading={loading} error={error} {...callbacks} />} />
        <Route path="/previous" element={<p>Previous page</p>} />
        <Route path="/elsewhere" element={<p>Another page</p>} />
      </Routes>
    </MemoryRouter></QueryClientProvider>
  )
  const view = render(content())
  return { ...view, ...callbacks, update: (loading: boolean, error: Error | null = null) => { view.rerender(content(loading, error)) } }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('RecoveryGroupsTable URL detail', () => {
  it('opens the exact decoded ID and closes only its search parameter', async () => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'First group' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Close recovery group detail' }))
    expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?keep=yes')
    expect(callbacks.onEdit).not.toHaveBeenCalled()
    expect(callbacks.onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/previous?previous=yes')
    expect(screen.getByText('Previous page')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History forward' }))
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/groups?keep=yes')
    expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
  })

  it('pushes row selection into the URL and follows Back and Forward', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByText('Second group'))
    expect(new URLSearchParams(screen.getByLabelText('Current search').textContent).get('detail')).toBe('second')
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'Second group' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'First group' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History forward' }))
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'Second group' })).toBeVisible()
  })

  it('finds the URL selection in the full collection beyond the visible page and search', async () => {
    const user = userEvent.setup()
    const records = Array.from({ length: 12 }, (_, index) => ({ ...firstGroup, id: `group-${String(index)}`, name: `Group ${String(index)}` }))
    renderTable({ records, search: '?detail=group-11' })
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'Group 11' })).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Search recovery groups' }), 'no match')
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'Group 11' })).toBeVisible()
  })

  it('shows a missing selection only after a successful load and lets it be cleared', async () => {
    const user = userEvent.setup()
    const view = renderTable({ search: '?detail=missing&keep=yes', records: [], isLoading: true })
    expect(screen.queryByText('The requested record missing was not found.')).not.toBeInTheDocument()
    view.update(false, new Error('offline'))
    expect(screen.queryByText('The requested record missing was not found.')).not.toBeInTheDocument()
    view.update(false)
    expect(screen.getByText('The requested record missing was not found.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Close detail selection' }))
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?keep=yes')
  })

  it.each(['detail', 'row menu'])('clears only detail before forwarding %s Edit with the original ID', async source => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    if (source === 'row menu') {
      await user.click(screen.getByRole('button', { name: 'Actions: First group' }))
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    } else await user.click(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('button', { name: 'Edit' }))
    expect(callbacks.onEdit).toHaveBeenCalledExactlyOnceWith(firstId)
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?keep=yes')
    expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
  })

  it.each([true, false])('clears the URL after successful Delete and retains it after failure: success=%s', async success => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    if (!success) callbacks.onDelete.mockRejectedValueOnce(new Error('Deletion failed'))
    await user.click(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete recovery group' })).getByRole('button', { name: 'Delete' }))
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Delete recovery group' })).not.toBeInTheDocument() })
    expect(callbacks.onDelete).toHaveBeenCalledExactlyOnceWith(firstGroup)
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByLabelText('Current search').textContent)
      expect(params.get('keep')).toBe('yes')
      expect(params.get('detail')).toBe(success ? null : firstId)
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' }) !== null).toBe(!success)
    })
  })

  it.each([true, false])('clears the URL after successful Rollback and retains it after failure: success=%s', async success => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    if (!success) callbacks.onRollback.mockRejectedValueOnce(new Error('Rollback failed'))
    await user.click(screen.getByRole('button', { name: 'Actions: First group' }))
    await user.click(screen.getByRole('menuitem', { name: 'Roll back' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Roll back orchestration?' })).getByRole('button', { name: 'Roll back' }))
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Roll back orchestration?' })).not.toBeInTheDocument() })
    expect(callbacks.onRollback).toHaveBeenCalledExactlyOnceWith(firstId, 'airflow')
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByLabelText('Current search').textContent)
      expect(params.get('keep')).toBe('yes')
      expect(params.get('detail')).toBe(success ? null : firstId)
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' }) !== null).toBe(!success)
    })
  })

  it.each(['Delete', 'Rollback'])('does not navigate back when pending %s finishes after leaving the route', async action => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    const pending = deferred<RollbackReport | null>()
    if (action === 'Delete') callbacks.onDelete.mockReturnValueOnce(pending.promise)
    else callbacks.onRollback.mockImplementationOnce(async () => (await pending.promise) ?? { status: 'ok' })
    if (action === 'Delete') {
      await user.click(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('button', { name: 'Delete' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Delete recovery group' })).getByRole('button', { name: 'Delete' }))
    } else {
      await user.click(screen.getByRole('button', { name: 'Actions: First group' }))
      await user.click(screen.getByRole('menuitem', { name: 'Roll back' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Roll back orchestration?' })).getByRole('button', { name: 'Roll back' }))
    }
    await user.click(screen.getByRole('button', { name: 'Leave list' }))
    await act(async () => { pending.resolve({ status: 'ok' }); await pending.promise })
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/elsewhere?leave=yes')
    expect(screen.getByText('Another page')).toBeVisible()
    expect(action === 'Delete' ? callbacks.onDelete : callbacks.onRollback).toHaveBeenCalledOnce()
  })

  it('keeps the URL detail open when an applied workload filter excludes its row', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Workload type' }), 'ibm_power_virtual_machines')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(within(screen.getByRole('table')).queryByText('First group')).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Second group')).toBeVisible()
    expect(within(screen.getByRole('dialog', { name: 'Recovery group detail' })).getByRole('heading', { name: 'First group' })).toBeVisible()
    expect(new URLSearchParams(screen.getByLabelText('Current search').textContent).get('detail')).toBe(firstId)
  })
})
