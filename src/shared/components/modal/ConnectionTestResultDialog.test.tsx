import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'
import { ConnectionTestResultDialog } from './ConnectionTestResultDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const airflowResult: ProviderTestResponseOutput = {
  ok: false,
  provider_id: 'airflow-01',
  provider_type: 'AIRFLOW',
  checks: [
    { name: 'Credentials', status: 'ok', detail: 'Validated' },
    { name: 'API', status: 'timeout', detail: 'Timed out' },
    { name: 'Scheduler', status: 'skipped', detail: 'Not run' },
    { name: 'Workers', status: 'unknown', detail: 'No result' },
    { name: 'DAGs', status: 'ok', detail: 'Available' },
    { name: 'Health', status: 'ok', detail: 'Healthy' },
  ],
}

const baseProps = {
  open: true,
  providerName: 'Airflow',
  providerId: 'airflow-01',
  isPending: false,
  result: airflowResult,
  error: null,
  onClose: vi.fn(),
  onRetry: vi.fn(),
}

describe('ConnectionTestResultDialog', () => {
  it('shows AIRFLOW without a role, six checks, skipped count, and the response body', () => {
    render(<ConnectionTestResultDialog {...baseProps} />)
    expect(screen.getByText('AIRFLOW')).toBeInTheDocument()
    expect(screen.queryByText('Source')).not.toBeInTheDocument()
    expect(screen.queryByText('Target')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Connection checks' }).children).toHaveLength(6)
    expect(screen.getByText('3 / 6 passed · 1 skipped')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Response body'))
    expect(screen.getByRole('dialog').textContent).toContain('"provider_type"')
  })

  it('allows Close and Escape while pending but never closes on backdrop', () => {
    const onClose = vi.fn()
    render(<ConnectionTestResultDialog {...baseProps} isPending result={airflowResult} onClose={onClose} />)
    expect(screen.getByRole('status', { name: 'Testing provider connection…' })).toBeInTheDocument()
    expect(screen.queryByText('Credentials')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    const backdrop = document.querySelector<HTMLElement>('[aria-hidden="true"].fixed.inset-0')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop ?? document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('shows a transport error without stale checks and offers retry', () => {
    render(<ConnectionTestResultDialog {...baseProps} result={null} error={new Error('Network unavailable')} />)
    expect(screen.getByText('Network unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Credentials')).not.toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.queryByText(/passed/)).not.toBeInTheDocument()
  })
})
