import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrchestratorPushResultDialog } from './OrchestratorPushResultDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('OrchestratorPushResultDialog', () => {
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
