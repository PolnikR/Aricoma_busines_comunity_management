import { StrictMode, useEffect } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, FALLBACK_AUTH_USER } from '@/contexts/AuthContext'
import { AppProviders } from '@/app/providers'
import { ConnectionTestManager } from './ConnectionTestManager'
import { useConnectionTestManager, useProviderTestState } from './ConnectionTestContext'
import { ConnectionTestProvider } from './ConnectionTestProvider'

const requests = vi.hoisted(() => ({ test: vi.fn<() => Promise<unknown>>() }))

vi.mock('@/generated/query/providers/providers.gen', () => ({
  getTestProviderQueryKey: (params: unknown) => ['/test_provider', params],
  getTestProviderQueryOptions: (_params: unknown, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: requests.test,
  }),
}))

afterEach(() => {
  cleanup()
  requests.test.mockReset()
  vi.unstubAllGlobals()
})

function ProviderProbe({ id, onRender }: { id: string; onRender: () => void }) {
  onRender()
  const state = useProviderTestState('infrastructure', id)
  return <span data-testid={id}>{state.run?.phase ?? 'none'}</span>
}

function ManagerProbe({ onManager }: { onManager: (manager: ConnectionTestManager) => void }) {
  const manager = useConnectionTestManager()
  useEffect(() => { onManager(manager) }, [manager, onManager])
  return null
}

describe('ConnectionTestContext', () => {
  it('updates only the subscribed provider when another run changes', () => {
    requests.test.mockImplementation(() => new Promise(() => undefined))
    const manager = new ConnectionTestManager(new QueryClient(), 'session')
    const firstRender = vi.fn()
    const secondRender = vi.fn()
    render(
      <ConnectionTestProvider manager={manager}>
        <ProviderProbe id="first" onRender={firstRender} />
        <ProviderProbe id="second" onRender={secondRender} />
      </ConnectionTestProvider>,
    )
    const secondCount = secondRender.mock.calls.length
    act(() => { manager.startTest('infrastructure', 'first', 'First') })
    expect(screen.getByTestId('first')).toHaveTextContent('pending')
    expect(firstRender.mock.calls.length).toBeGreaterThan(1)
    expect(secondRender).toHaveBeenCalledTimes(secondCount)
  })

  it('blocks unknown auth identity and clears an old run when the user changes', () => {
    requests.test.mockImplementation(() => new Promise(() => undefined))
    vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'true' })
    const onManager = vi.fn<(manager: ConnectionTestManager) => void>()
    const renderTree = (id: string) => (
      <AuthContext.Provider value={{ status: 'authenticated', user: { ...FALLBACK_AUTH_USER, id } }}>
        <AppProviders><ManagerProbe onManager={onManager} /></AppProviders>
      </AuthContext.Provider>
    )
    const view = render(renderTree('unknown'))
    const manager = onManager.mock.lastCall?.[0]
    expect(manager?.startTest('infrastructure', 'id', 'Provider')).toEqual({ status: 'rejected', reason: 'session' })
    view.rerender(renderTree('alice'))
    expect(manager?.startTest('infrastructure', 'id', 'Provider').status).toBe('started')
    expect(requests.test).toHaveBeenCalledTimes(1)
    view.rerender(renderTree('bob'))
    expect(manager?.getProviderTestState('infrastructure', 'id').run).toBeNull()
  })

  it('preserves a run through StrictMode effect replay and clears it on unmount', async () => {
    requests.test.mockImplementation(() => new Promise(() => undefined))
    vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'false' })
    const onManager = vi.fn<(manager: ConnectionTestManager) => void>()
    const view = render(
      <StrictMode>
        <AuthContext.Provider value={{ status: 'authenticated', user: FALLBACK_AUTH_USER }}>
          <AppProviders><ManagerProbe onManager={onManager} /></AppProviders>
        </AuthContext.Provider>
      </StrictMode>,
    )
    const manager = onManager.mock.lastCall?.[0]
    await Promise.resolve()
    expect(manager?.startTest('infrastructure', 'strict', 'Provider').status).toBe('started')
    expect(manager?.getProviderTestState('infrastructure', 'strict').run?.phase).toBe('pending')
    view.unmount()
    await Promise.resolve()
    expect(manager?.getProviderTestState('infrastructure', 'strict').run).toBeNull()
  })

  it('uses a temporary scope in development auth bypass', () => {
    requests.test.mockImplementation(() => new Promise(() => undefined))
    vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'false' })
    const onManager = vi.fn<(manager: ConnectionTestManager) => void>()
    render(
      <AuthContext.Provider value={{ status: 'authenticated', user: FALLBACK_AUTH_USER }}>
        <AppProviders><ManagerProbe onManager={onManager} /></AppProviders>
      </AuthContext.Provider>,
    )
    expect(onManager.mock.lastCall?.[0].startTest('infrastructure', 'id', 'Provider').status).toBe('started')
    expect(requests.test).toHaveBeenCalledTimes(1)
  })
})
