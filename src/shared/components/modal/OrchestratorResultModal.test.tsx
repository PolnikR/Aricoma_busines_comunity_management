import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrchestratorResultModal } from './OrchestratorResultModal'

describe('OrchestratorResultModal', () => {
  it('renders the orchestrator status, details and optional external action', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onExternalAction = vi.fn()

    render(
      <OrchestratorResultModal
        open
        onClose={onClose}
        title="Orchestrator run started"
        description="The recovery application is now under orchestrator control."
        statusLabel="Status"
        status="pushed"
        closeLabel="Close"
        externalActionLabel="View in Airflow"
        onExternalAction={onExternalAction}
        details={[
          { label: 'DAG', value: '/home/airflow/dags/recovery.py', mono: true },
          { label: 'JSON', value: '/home/airflow/dags/recovery.json', mono: true },
          { label: 'DAG ID', value: 'dag_recovery_1', mono: true },
        ]}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Orchestrator run started' })).toBeInTheDocument()
    expect(screen.getByText('pushed')).toBeInTheDocument()
    expect(screen.getByText('/home/airflow/dags/recovery.py')).toBeInTheDocument()
    expect(screen.getByText('dag_recovery_1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(onExternalAction).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
