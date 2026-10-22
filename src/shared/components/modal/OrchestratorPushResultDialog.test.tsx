import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrchestratorPushResultDialog } from './OrchestratorPushResultDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('OrchestratorPushResultDialog', () => {
  it.each([{ notes: undefined }, { notes: null }, { notes: [] }, { notes: ['  ', ''] }])('explains manual execution even without usable notes ($notes)', ({ notes }) => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance"
      result={{ status: 'pushed', schedule: 'manual_only', ...(notes === undefined ? {} : { notes }), dag_id: 'finance' }} />)
    const info = screen.getByRole('region', { name: 'Manual execution in Airflow' })
    expect(info).toHaveTextContent('The DAG was successfully pushed, but has not started yet.')
    expect(info).toHaveTextContent('first select Unpause, then Trigger')
    expect(within(info).queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View in Airflow' })).toBeInTheDocument()
    expect(screen.getByText('1 / 1 passed')).toBeInTheDocument()
  })

  it('shows trimmed unique backend notes as text, retaining the original response', () => {
    const markup = '<img src=x onerror="alert(1)"> https://example.test'
    const longNote = 'Long note '.repeat(100)
    const { container } = render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance"
      result={{ status: 'pushed', schedule: 'manual_only', notes: ['  Backend instruction  ', '', 'Backend instruction', markup, longNote] }} />)
    const info = screen.getByRole('region', { name: 'Manual execution in Airflow' })
    expect(info).toHaveFocus()
    expect(within(info).getAllByRole('listitem')).toHaveLength(3)
    expect(within(info).getByText('Backend instruction')).toBeInTheDocument()
    expect(within(info).getByText(markup)).toBeInTheDocument()
    expect(info).toHaveTextContent(longNote.trim())
    expect(within(info).queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('OrchestratorPush')).toBeInTheDocument()
    expect(screen.getAllByText(/Backend instruction/).length).toBeGreaterThan(1)
  })

  it.each([undefined, null, 'daily'])('keeps the existing modal for schedule %j', schedule => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance"
      result={{ status: 'pushed', ...(schedule === undefined ? {} : { schedule }), notes: ['Backend note'] }} />)
    expect(screen.queryByRole('region', { name: 'Manual execution in Airflow' })).not.toBeInTheDocument()
    expect(screen.queryByText('The DAG was successfully pushed, but has not started yet.')).not.toBeInTheDocument()
    expect(screen.getByText('1 / 1 passed')).toBeInTheDocument()
  })

  it('keeps skipped manual-only results neutral without claiming a successful push', () => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance"
      result={{ status: 'skipped', schedule: 'manual_only', reason: 'Provider disabled' }} />)
    const info = screen.getByRole('region', { name: 'Manual execution in Airflow' })
    expect(info).toHaveTextContent('first select Unpause, then Trigger')
    expect(info).not.toHaveTextContent('successfully pushed')
    expect(screen.getByRole('heading', { name: 'Orchestrator push skipped' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
  })

  it('shows the actual deployment result, full DAG path and response with the existing dialog layout', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const dag = `/airflow/${'nested/'.repeat(20)}finance.py`
    render(<OrchestratorPushResultDialog entityType="application" open onClose={onClose} entityName="Finance"
      result={{ status: 'pushed', dag_id: 'dag_finance', dag, json: '/airflow/finance.json' }}
      providerUrl="https://airflow.example.test:8443" />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('max-w-2xl')
    expect(within(dialog).getByText('Finance')).toBeInTheDocument()
    expect(within(dialog).getByText('dag_finance')).toBeInTheDocument()
    expect(within(dialog).getByText('2 / 2 passed')).toBeInTheDocument()
    expect(within(dialog).getByRole('list')).toHaveTextContent(dag)
    expect(within(dialog).getByRole('list')).toHaveTextContent('pushed')
    expect(within(dialog).queryByText(/Queued|Running|Success/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(open).toHaveBeenCalledWith('https://airflow.example.test:8443/dags/dag_finance', '_blank', 'noopener,noreferrer')
    open.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not invent successful checks or a DAG link for a skipped push', () => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance"
      result={{ status: 'skipped', reason: 'Provider disabled', dag: null, dag_id: null, json: null }} />)
    expect(screen.getByRole('list')).toHaveTextContent('skipped')
    expect(screen.getByRole('list')).toHaveTextContent('Provider disabled')
    expect(screen.getByText('0 / 1 passed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
    expect(screen.queryByText('DAG path')).not.toBeInTheDocument()
  })

  it.each([null, undefined])('handles an absent result (%s) without success claims', result => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance" result={result} />)
    expect(screen.getByRole('dialog')).toHaveTextContent('The API did not return an orchestrator push result.')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByText(/passed/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
  })

  it('counts only available results when DAG details are missing', () => {
    render(<OrchestratorPushResultDialog entityType="application" open onClose={vi.fn()} entityName="Finance" result={{ status: 'pushed', dag: '  ' }} />)
    expect(screen.getByText('1 / 1 passed')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
  })
})
