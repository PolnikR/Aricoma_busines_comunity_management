import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers'
import { AuthContext, FALLBACK_AUTH_USER } from '@/contexts/AuthContext'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'
import { useConnectionTestManager } from './ConnectionTestContext'

const request = vi.hoisted(() => vi.fn<() => Promise<ProviderTestResponseOutput>>())

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  getTestPlatformProviderQueryKey: (params: unknown) => ['/test_platform_provider', params],
  getTestPlatformProviderQueryOptions: (_params: unknown, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: request,
  }),
}))

afterEach(() => {
  cleanup()
  request.mockReset()
  vi.unstubAllGlobals()
})

function ProviderRoute() {
  const manager = useConnectionTestManager()
  const [started, setStarted] = useState(false)
  return (
    <main>
      <button type="button" onClick={() => { manager.startTest('platform', 'airflow-01', 'Primary Airflow'); setStarted(true) }}>
        Test connection
      </button>
      {started ? <span>Started</span> : null}
      <Link to="/other">Other page</Link>
    </main>
  )
}

it('keeps a hidden pending test through navigation and opens its result without another request', async () => {
  let resolve!: (value: ProviderTestResponseOutput) => void
  request.mockReturnValue(new Promise((yes) => { resolve = yes }))
  vi.stubGlobal('__APP_CONFIG__', { AUTH_ENABLED: 'false' })
  render(
    <AuthContext.Provider value={{ status: 'authenticated', user: FALLBACK_AUTH_USER }}>
      <AppProviders>
        <MemoryRouter initialEntries={['/providers']}>
          <Routes>
            <Route path="/providers" element={<ProviderRoute />} />
            <Route path="/other" element={<main>Other route</main>} />
          </Routes>
        </MemoryRouter>
      </AppProviders>
    </AuthContext.Provider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
  expect(screen.getByRole('dialog', { name: 'Test provider connection' })).toHaveTextContent('Testing provider connection…')
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  fireEvent.click(screen.getByRole('link', { name: 'Other page' }))
  expect(screen.getByText('Other route')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await act(async () => {
    resolve({
      provider_id: 'airflow-01',
      provider_type: 'AIRFLOW',
      ok: true,
      checks: [{ name: 'Reachability', status: 'ok', detail: 'Connected' }],
    })
    await Promise.resolve()
  })
  expect(screen.getByRole('status')).toHaveTextContent('Primary Airflow')
  fireEvent.click(screen.getByRole('button', { name: /View result/ }))
  expect(screen.getByRole('dialog', { name: 'Test provider connection' })).toHaveTextContent('Connected')
  expect(request).toHaveBeenCalledTimes(1)
})
