import { QueryClient } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'
import { ConnectionTestManager } from './ConnectionTestManager'
import { ConnectionTestProvider } from './ConnectionTestProvider'
import { ConnectionTestHost } from './ConnectionTestHost'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const requests = vi.hoisted(() => ({
  platform: vi.fn<(params: { provider_id: string }) => Promise<ProviderTestResponseOutput>>(),
}))

vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  getTestPlatformProviderQueryKey: (params: unknown) => ['/test_platform_provider', params],
  getTestPlatformProviderQueryOptions: (params: { provider_id: string }, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: () => requests.platform(params),
  }),
}))

const result = (id: string): ProviderTestResponseOutput => ({
  provider_id: id,
  provider_type: 'AIRFLOW',
  ok: true,
  checks: [{ name: 'Reachability', status: 'ok', detail: 'Available' }],
})

afterEach(() => {
  cleanup()
  requests.platform.mockReset()
})

function renderHost(manager: ConnectionTestManager) {
  return render(
    <ConnectionTestProvider manager={manager}>
      <main><button type="button">Page action</button></main>
      <ConnectionTestHost />
    </ConnectionTestProvider>,
  )
}

describe('ConnectionTestHost', () => {
  it('updates an open pending modal without a notification', async () => {
    let resolve!: (value: ProviderTestResponseOutput) => void
    requests.platform.mockReturnValue(new Promise((yes) => { resolve = yes }))
    const manager = new ConnectionTestManager(new QueryClient(), 'session')
    renderHost(manager)
    act(() => { manager.startTest('platform', 'airflow', 'Airflow') })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Connection successful')).not.toBeInTheDocument()
    await act(async () => {
      resolve(result('airflow'))
      await Promise.resolve()
    })
    expect(screen.getByText('Connection test completed')).toBeInTheDocument()
    expect(manager.getSnapshot().notificationRunIds).toHaveLength(0)
  })

  it('shows five cards and retains the sixth until a result is opened, without another GET', async () => {
    requests.platform.mockImplementation((params) => Promise.resolve(result(params.provider_id)))
    const manager = new ConnectionTestManager(new QueryClient(), 'session')
    renderHost(manager)
    for (let index = 0; index < 6; index++) {
      act(() => {
        manager.startTest('platform', String(index), `Airflow ${String(index)}`)
        manager.closeResult()
      })
    }
    await vi.waitFor(() => {
      expect(manager.getSnapshot().notificationRunIds).toHaveLength(6)
      expect(screen.getAllByRole('status')).toHaveLength(5)
    })
    expect(screen.queryByText('Airflow 5')).not.toBeInTheDocument()
    const viewButton = screen.getAllByRole('button', { name: /View result/ }).at(0)
    if (!viewButton) throw new Error('Missing result action')
    fireEvent.click(viewButton)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(requests.platform).toHaveBeenCalledTimes(6)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getAllByRole('status')).toHaveLength(5)
    expect(screen.getByText('Airflow 5')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0])
    expect(screen.getAllByRole('status')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Page action' })).toHaveFocus()
  })

  it('allows a session warning to be dismissed without starting a test', () => {
    const manager = new ConnectionTestManager(new QueryClient(), null)
    renderHost(manager)
    act(() => { manager.startTest('platform', 'airflow', 'Airflow') })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
