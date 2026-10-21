import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OrchestratorPushResult } from './OrchestratorPushResultDialog'
import { OrchestratorPushResultDialog } from './OrchestratorPushResultDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const push = {
  status: 'pushed',
  dag: '/home/airflow/dags/dag_recovery.py',
  json: '/home/airflow/dags/dag_recovery.json',
  dag_id: 'dag_recovery',
} satisfies OrchestratorPushResult

describe('OrchestratorPushResultDialog', () => {
  it('shows all orchestrator response values and closes on request', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <OrchestratorPushResultDialog
        entityType="application"
        open
        onClose={onClose}
        entityName="Finance App"
        result={push}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText(push.status).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(push.dag.replace(/\./g, '\\.'))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(push.json.replace(/\./g, '\\.'))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(push.dag_id)).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('opens the exact DAG using the provider URL when "View in Airflow" is clicked', async () => {
    const user = userEvent.setup()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    render(
      <OrchestratorPushResultDialog
        entityType="application"
        open
        onClose={vi.fn()}
        entityName="Finance App"
        result={push}
        providerUrl="https://airflow.dynamic.test:8443"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://airflow.dynamic.test:8443/dags/dag_recovery',
      '_blank',
      'noopener,noreferrer',
    )

    openSpy.mockRestore()
  })

  it('shows the full orchestrator response body for inspection', () => {
    render(
      <OrchestratorPushResultDialog
        entityType="application"
        open
        onClose={vi.fn()}
        entityName="Finance App"
        result={push}
      />,
    )

    expect(screen.getByText('OrchestratorPush')).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(push.dag_id)).length).toBeGreaterThan(0)
  })
})
