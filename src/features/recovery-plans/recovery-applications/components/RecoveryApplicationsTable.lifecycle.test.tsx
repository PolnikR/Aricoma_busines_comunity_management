import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  useGetPlatformProviders: () => ({ data: [{ id: 'airflow-other', name: 'Stored Airflow', url: 'https://stored-airflow.test' }] }),
}))
vi.mock('@/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails', () => ({ useSelectedOrchestrationDetails: () => null }))
vi.mock('./RecoveryApplicationInventory', () => ({ RecoveryApplicationInventory: () => null }))

const app: RecoveryApplicationListItem = {
  id: 'finance.json', pushToOrchestrator: true, orchestrationProviderId: 'airflow-other', airflowRunId: 'retained-run',
  data: { application: { name: 'Finance', description: '', environment: 'prod', platform: 'VMWARE', tiers: {} } },
}

describe('application DAG lifecycle actions', () => {
  it('blocks pushed menu and drawer Edit while keeping Display available', async () => {
    const user = userEvent.setup(), onEdit = vi.fn()
    render(<MemoryRouter><RecoveryApplicationsTable applications={[app]} onEdit={onEdit} onDelete={vi.fn()} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeDisabled()
    await user.keyboard('{Escape}')
    await user.click(screen.getByText('Finance'))
    expect(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('offers standalone rollback without Delete, cancels then reports success and retains the row', async () => {
    const user = userEvent.setup(), onRollback = vi.fn().mockResolvedValue({ report: { status: 'ok' } })
    render(<MemoryRouter><RecoveryApplicationsTable applications={[app]} onRollback={onRollback} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    let dialog = screen.getByRole('dialog', { name: 'Rollback recovery application' })
    expect(dialog).toHaveTextContent('configuration remains saved')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onRollback).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    dialog = screen.getByRole('dialog', { name: 'Rollback recovery application' })
    await user.click(within(dialog).getByRole('button', { name: 'Rollback' }))
    expect(onRollback).toHaveBeenCalledExactlyOnceWith(app)
    expect(await screen.findByRole('dialog', { name: 'Recovery application rollback result' })).toHaveTextContent('ok')
    expect(screen.getAllByText('Finance').length).toBeGreaterThan(0)
  })

  it.each(['partial', 'failed'] as const)('shows a %s report from HTTP 502 and keeps Edit locked', async status => {
    const user = userEvent.setup()
    const onRollback = vi.fn().mockRejectedValue(new OrvalApiError(502, 'Bad Gateway', { detail: { rollback: { status, compute: { status: 'failed', errors: ['cleanup error'] } } } }))
    render(<MemoryRouter><RecoveryApplicationsTable applications={[app]} onEdit={vi.fn()} onRollback={onRollback} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Rollback recovery application' })).getByRole('button', { name: 'Rollback' }))
    expect(await screen.findByRole('dialog', { name: 'Recovery application rollback result' })).toHaveTextContent(status)
  })

  it('disables draft rollback and enables Edit even with a retained run ID', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RecoveryApplicationsTable applications={[{ ...app, pushToOrchestrator: false }]} onEdit={vi.fn()} onRollback={vi.fn()} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    expect(screen.getByRole('menuitem', { name: 'Rollback' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeEnabled()
  })

  it('prevents duplicate rollback confirmation while pending', async () => {
    const user = userEvent.setup()
    let finish!: (value: { report: { status: 'ok' } }) => void
    const onRollback = vi.fn(() => new Promise<{ report: { status: 'ok' } }>(resolve => { finish = resolve }))
    render(<MemoryRouter><RecoveryApplicationsTable applications={[app]} onRollback={onRollback} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Rollback recovery application' })).getByRole('button', { name: 'Rollback' }))
    expect(onRollback).toHaveBeenCalledOnce()
    expect(within(screen.getByRole('dialog', { name: 'Rollback recovery application' })).getByRole('button', { name: 'Rolling back...' })).toBeDisabled()
    act(() => { finish({ report: { status: 'ok' } }) })
    expect(await screen.findByRole('dialog', { name: 'Recovery application rollback result' })).toBeInTheDocument()
  })

  it('displays backend authorization failure without enabling Edit', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RecoveryApplicationsTable applications={[app]} onEdit={vi.fn()}
      onRollback={vi.fn().mockRejectedValue(new OrvalApiError(403, 'Forbidden', { detail: 'Forbidden' }))} /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Rollback recovery application' })).getByRole('button', { name: 'Rollback' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')
    await user.click(screen.getByRole('button', { name: 'Actions: Finance' }))
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeDisabled()
  })

  it('displays the deployed version independently of configured selection', async () => {
    const user = userEvent.setup()
    const record = { ...app, deployedTemplateVersion: 'v1', data: { application: { ...app.data.application, dag_template_version: 'v2' } } }
    render(<MemoryRouter><RecoveryApplicationsTable applications={[record]} /></MemoryRouter>)
    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    const dialog = screen.getByRole('dialog', { name: 'Application detail' })
    expect(dialog).toHaveTextContent('Deployed DAG Template Version')
    expect(within(dialog).getByText('v1')).toBeInTheDocument()
    expect(within(dialog).queryByText('v2')).not.toBeInTheDocument()
  })

  it('labels a draft version as configured and its retained run ID as history', async () => {
    const user = userEvent.setup()
    const record = { ...app, pushToOrchestrator: false, data: { application: { ...app.data.application, dag_template_version: 'v2' } } }
    render(<MemoryRouter><RecoveryApplicationsTable applications={[record]} /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /retained-run/ })).not.toBeInTheDocument()
    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    const dialog = screen.getByRole('dialog', { name: 'Application detail' })
    expect(dialog).toHaveTextContent('Configured DAG Template Version')
    expect(dialog).toHaveTextContent('DAG Run ID (retained history)')
    expect(within(dialog).getByText('v2')).toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: /retained-run/ })).not.toBeInTheDocument()
  })

  it('does not substitute configured version for an unknown deployed version', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RecoveryApplicationsTable applications={[{ ...app, data: { application: { ...app.data.application, dag_template_version: 'v2' } } }]} /></MemoryRouter>)
    await user.click(screen.getByText('Finance'))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    const dialog = screen.getByRole('dialog', { name: 'Application detail' })
    expect(within(dialog).getByText('Unknown')).toBeInTheDocument()
    expect(within(dialog).queryByText('v2')).not.toBeInTheDocument()
  })
})
