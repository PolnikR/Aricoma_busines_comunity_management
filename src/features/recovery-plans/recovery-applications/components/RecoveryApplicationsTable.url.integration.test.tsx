import type { ComponentProps } from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  useGetPlatformProviders: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails', () => ({
  useSelectedOrchestrationDetails: () => null,
}))

const firstId = 'app / A+&?č.json'
const firstApplication: RecoveryApplicationListItem = { id: firstId, data: { application: { name: 'First application', environment: 'prod', platform: 'VMWARE', tiers: {} } } }
const applications: RecoveryApplicationListItem[] = [firstApplication,
  { id: 'second', data: { application: { name: 'Second application', environment: 'dev', platform: 'IBM_POWER', tiers: {} } } },
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

function renderTable(options: { search?: string; records?: RecoveryApplicationListItem[]; isLoading?: boolean; error?: Error | null } = {}) {
  const callbacks = { onEdit: vi.fn<(id: string) => void>(),
    onDelete: vi.fn<NonNullable<ComponentProps<typeof RecoveryApplicationsTable>['onDelete']>>().mockResolvedValue({ applications: [], rollback: null }) }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const content = (loading = options.isLoading ?? false, error = options.error ?? null) => (
    <QueryClientProvider client={client}><MemoryRouter initialEntries={['/previous?previous=yes', `/apps${options.search ?? `?keep=yes&detail=${encodeURIComponent(firstId)}`}`]}>
      <History /><Routes><Route path="/apps" element={<RecoveryApplicationsTable applications={options.records ?? applications}
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

describe('RecoveryApplicationsTable URL detail', () => {
  it('opens the exact decoded ID and closes only its search parameter', async () => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'First application' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Close application' }))
    expect(screen.queryByRole('dialog', { name: 'Application detail' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?keep=yes')
    expect(callbacks.onEdit).not.toHaveBeenCalled()
    expect(callbacks.onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/previous?previous=yes')
    expect(screen.getByText('Previous page')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History forward' }))
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/apps?keep=yes')
    expect(screen.queryByRole('dialog', { name: 'Application detail' })).not.toBeInTheDocument()
  })

  it('pushes row selection into the URL and follows Back and Forward', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByText('Second application'))
    expect(new URLSearchParams(screen.getByLabelText('Current search').textContent).get('detail')).toBe('second')
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'Second application' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'First application' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'History forward' }))
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'Second application' })).toBeVisible()
  })

  it('finds the URL selection in the full collection beyond the visible page and search', async () => {
    const user = userEvent.setup()
    const records = Array.from({ length: 12 }, (_, index) => ({ ...firstApplication, id: `app-${String(index)}`, data: { application: { ...firstApplication.data.application, name: `Application ${String(index)}` } } }))
    renderTable({ records, search: '?detail=app-11' })
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'Application 11' })).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Search applications' }), 'no match')
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'Application 11' })).toBeVisible()
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
      await user.click(screen.getByRole('button', { name: 'Actions: First application' }))
      await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    } else await user.click(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Edit' }))
    expect(callbacks.onEdit).toHaveBeenCalledExactlyOnceWith(firstId)
    expect(screen.getByLabelText('Current search')).toHaveTextContent('?keep=yes')
    expect(screen.queryByRole('dialog', { name: 'Application detail' })).not.toBeInTheDocument()
  })

  it.each([true, false])('clears the URL after successful Delete and retains it after failure: success=%s', async success => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    if (!success) callbacks.onDelete.mockRejectedValueOnce(new Error('Deletion failed'))
    await user.click(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete recovery application' })).getByRole('button', { name: 'Delete' }))
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Delete recovery application' })).not.toBeInTheDocument() })
    expect(callbacks.onDelete).toHaveBeenCalledExactlyOnceWith(firstApplication)
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByLabelText('Current search').textContent)
      expect(params.get('keep')).toBe('yes')
      expect(params.get('detail')).toBe(success ? null : firstId)
      expect(screen.queryByRole('dialog', { name: 'Application detail' }) !== null).toBe(!success)
    })
  })

  it('does not navigate back when pending Delete finishes after leaving the route', async () => {
    const user = userEvent.setup()
    const callbacks = renderTable()
    const pending = deferred<Awaited<ReturnType<typeof callbacks.onDelete>>>()
    callbacks.onDelete.mockReturnValueOnce(pending.promise)
    await user.click(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete recovery application' })).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Leave list' }))
    await act(async () => { pending.resolve({ applications: [], rollback: null }); await pending.promise })
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/elsewhere?leave=yes')
    expect(screen.getByText('Another page')).toBeVisible()
    expect(callbacks.onDelete).toHaveBeenCalledExactlyOnceWith(firstApplication)
  })

  it('keeps the URL detail open when an applied environment filter excludes its row', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Environment' }), 'dev')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(within(screen.getByRole('table')).queryByText('First application')).not.toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Second application')).toBeVisible()
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('heading', { name: 'First application' })).toBeVisible()
    expect(new URLSearchParams(screen.getByLabelText('Current search').textContent).get('detail')).toBe(firstId)
  })
})
