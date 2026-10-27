import { useState, type Dispatch, type SetStateAction } from 'react'
import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { OrchestratorPush } from '../model/recoveryApplicationTypes'
import {
  useRecoveryApplicationSaveCompletion,
  type ApplicationSaveCompletion,
  type SaveCompletionInput,
  type SaveCompletionOptions,
} from './useRecoveryApplicationSaveCompletion'

const providers = [{ id: 'airflow-01', url: 'https://airflow.original.test' }]
const submitted = { name: 'Submitted Finance', pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' }
const applicationsPath = '/recovery-plans/recovery-applications'

function setup(platformProviders: SaveCompletionOptions['platformProviders'] = providers) {
  let current!: ApplicationSaveCompletion
  let setProviders!: Dispatch<SetStateAction<SaveCompletionOptions['platformProviders']>>
  function Draft() {
    const [catalog, updateCatalog] = useState(platformProviders)
    setProviders = updateCatalog
    current = useRecoveryApplicationSaveCompletion({ platformProviders: catalog })
    return <div>Application draft</div>
  }
  const router = createMemoryRouter([
    { path: '/draft', element: <Draft /> },
    { path: applicationsPath, element: <div>Applications list</div> },
    { path: '/elsewhere', element: <div>Other route</div> },
  ], { initialEntries: ['/draft'] })
  render(<RouterProvider router={router} />)
  return { get current() { return current }, router, setProviders: (next: SaveCompletionOptions['platformProviders']) => {
    act(() => { setProviders(next) })
  } }
}

function unloadIsBlocked() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

describe('useRecoveryApplicationSaveCompletion', () => {
  it('leaves a clean draft immediately', async () => {
    const flow = setup()
    act(() => { flow.current.requestBack() })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
  })

  it('guards dirty Back, keeps the draft on cancel, then exits on confirm', async () => {
    const flow = setup()
    expect(unloadIsBlocked()).toBe(false)
    act(() => { flow.current.markDirty(true) })
    expect(unloadIsBlocked()).toBe(true)
    act(() => { flow.current.requestBack() })
    expect(flow.current.discardDialog.open).toBe(true)
    expect(flow.router.state.location.pathname).toBe('/draft')
    act(() => { flow.current.discardDialog.cancel() })
    expect(flow.current.discardDialog.open).toBe(false)
    expect(unloadIsBlocked()).toBe(true)
    act(() => { flow.current.requestBack() })
    act(() => { flow.current.discardDialog.confirm() })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
    expect(unloadIsBlocked()).toBe(false)
  })

  it('blocks actual router navigation and delegates cancel and proceed', async () => {
    const flow = setup()
    act(() => { flow.current.markDirty(true) })
    await act(async () => { await flow.router.navigate('/elsewhere') })
    expect(flow.current.discardDialog.open).toBe(true)
    expect(flow.router.state.location.pathname).toBe('/draft')
    act(() => { flow.current.discardDialog.cancel() })
    expect(flow.router.state.location.pathname).toBe('/draft')
    await act(async () => { await flow.router.navigate('/elsewhere') })
    act(() => { flow.current.discardDialog.confirm() })
    expect(await screen.findByText('Other route')).toBeInTheDocument()
  })

  it.each([
    { submitted: { ...submitted, pushToOrchestrator: false }, response: { applications: [] } },
    { submitted: { ...submitted, pushToOrchestrator: false }, response: { applications: [], orchestrator_push: { status: 'pushed' } } },
    { submitted, response: { applications: [] } },
  ] satisfies SaveCompletionInput[])('bypasses dirty navigation for a local completion or adapter-bypass fallback (%j)', async input => {
    const flow = setup()
    act(() => { flow.current.markDirty(true) })
    act(() => { flow.current.completeSave(input) })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
    expect(flow.current.pushDialog).toBeNull()
  })

  it.each([
    null,
    { status: 'skipped', reason: 'Provider disabled' },
    { status: 'pushed', dag_id: 'dag_finance', schedule: 'manual_only', notes: ['Backend instruction'] },
  ] satisfies (OrchestratorPush | null)[])('retains the full push response and submitted identity until dismissal (%j)', async result => {
    const flow = setup()
    act(() => { flow.current.markDirty(true) })
    act(() => { flow.current.completeSave({ submitted, response: { applications: [], orchestrator_push: result } }) })
    expect(flow.current.pushDialog).toEqual({
      entityName: 'Submitted Finance', result, providerUrl: 'https://airflow.original.test',
    })
    expect(flow.router.state.location.pathname).toBe('/draft')
    expect(unloadIsBlocked()).toBe(false)
    act(() => { flow.current.dismissPushDialog() })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
  })

  it.each([
    { platformProviders: [] },
    { platformProviders: [{ id: 'other', url: 'https://wrong.test' }] },
    { platformProviders: [{ id: 'airflow-01', url: null }] },
  ])('leaves missing provider URLs to the existing dialog fallback (%j)', ({ platformProviders }) => {
    const flow = setup(platformProviders)
    act(() => { flow.current.completeSave({ submitted, response: { applications: [], orchestrator_push: null } }) })
    expect(flow.current.pushDialog?.providerUrl).toBeUndefined()
    expect(flow.current.pushDialog).not.toBeNull()
  })

  it('uses the submitting render provider catalog when completion arrives after a catalog refresh', () => {
    const flow = setup()
    const completeSubmittedSave = flow.current.completeSave
    flow.setProviders([{ id: 'airflow-01', url: 'https://airflow.new.test' }])
    act(() => { completeSubmittedSave({ submitted, response: { applications: [], orchestrator_push: null } }) })
    expect(flow.current.pushDialog?.providerUrl).toBe('https://airflow.original.test')
  })

  it('protects unload during a clean Save and clears protection only after push success', async () => {
    const flow = setup()
    expect(unloadIsBlocked()).toBe(false)
    act(() => { flow.current.beginSave() })
    expect(unloadIsBlocked()).toBe(true)
    const completeSubmittedSave = flow.current.completeSave
    act(() => { completeSubmittedSave({ submitted, response: { applications: [], orchestrator_push: null } }) })
    expect(unloadIsBlocked()).toBe(false)
    act(() => { flow.current.dismissPushDialog() })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
  })

  it('clears the pending discard action when push success takes over', async () => {
    const flow = setup()
    act(() => { flow.current.markDirty(true) })
    act(() => { flow.current.requestBack() })
    act(() => { flow.current.completeSave({ submitted, response: { applications: [], orchestrator_push: null } }) })
    expect(flow.current.discardDialog.open).toBe(false)
    expect(flow.current.pushDialog?.result).toBeNull()
    act(() => { flow.current.discardDialog.cancel() })
    expect(flow.current.discardDialog.open).toBe(false)
    expect(flow.router.state.location.pathname).toBe('/draft')
    act(() => { flow.current.dismissPushDialog() })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
  })

  it.each([false, true])('treats Save as exclusive even for a clean draft (dirty=%s)', async dirty => {
    const flow = setup()
    act(() => { flow.current.markDirty(dirty) })
    let started = false
    act(() => {
      started = flow.current.beginSave()
      expect(flow.current.beginSave()).toBe(false)
    })
    expect(started).toBe(true)
    expect(flow.current.isSaving).toBe(true)
    act(() => { expect(flow.current.beginSave()).toBe(false) })
    act(() => { flow.current.requestBack() })
    await act(async () => { await flow.router.navigate('/elsewhere') })
    expect(flow.router.state.location.pathname).toBe('/draft')
    expect(flow.current.discardDialog.open).toBe(false)
    expect(unloadIsBlocked()).toBe(true)
    act(() => { flow.current.failSave() })
    expect(flow.current.isSaving).toBe(false)
    expect(flow.current.discardDialog.open).toBe(false)
    expect(unloadIsBlocked()).toBe(dirty)
    act(() => { flow.current.requestBack() })
    if (dirty) {
      expect(flow.current.discardDialog.open).toBe(true)
      act(() => { flow.current.discardDialog.confirm() })
    }
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
  })

  it.each([false, true])('ignores stale Discard callbacks during Save and success, then navigates exactly once (push=%s)', async push => {
    const flow = setup()
    act(() => { flow.current.markDirty(true) })
    act(() => { flow.current.requestBack() })
    const staleConfirm = flow.current.discardDialog.confirm
    const complete = flow.current.completeSave
    act(() => { flow.current.beginSave() })
    act(() => { staleConfirm() })
    expect(flow.router.state.location.pathname).toBe('/draft')
    await act(async () => { await flow.router.navigate('/elsewhere') })
    const input: SaveCompletionInput = { submitted: { ...submitted, pushToOrchestrator: push },
      response: { applications: [], ...(push ? { orchestrator_push: null } : {}) } }
    const navigation = vi.spyOn(flow.router, 'navigate')
    act(() => { complete(input) })
    act(() => { staleConfirm() })
    if (push) {
      expect(flow.current.discardDialog.open).toBe(false)
      expect(flow.router.state.location.pathname).toBe('/draft')
      expect(flow.current.pushDialog).not.toBeNull()
      const close = flow.current.dismissPushDialog
      act(() => { close(); close() })
    }
    act(() => { complete(input) })
    expect(await screen.findByText('Applications list')).toBeInTheDocument()
    expect(navigation).toHaveBeenCalledTimes(1)
  })
})
