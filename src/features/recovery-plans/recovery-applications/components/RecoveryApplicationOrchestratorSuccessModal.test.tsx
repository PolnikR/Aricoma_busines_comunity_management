import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OrchestratorPush } from '../model/recoveryApplicationTypes'
import { RecoveryApplicationOrchestratorSuccessModal } from './RecoveryApplicationOrchestratorSuccessModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const push: OrchestratorPush = {
  status: 'pushed',
  dag: '/home/airflow/dags/dag_recovery.py',
  json: '/home/airflow/dags/dag_recovery.json',
  dag_id: 'dag_recovery',
}

describe('RecoveryApplicationOrchestratorSuccessModal', () => {
  it('shows all orchestrator response values and closes on request', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <RecoveryApplicationOrchestratorSuccessModal
        open
        onClose={onClose}
        applicationName="Finance App"
        orchestratorPush={push}
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
      <RecoveryApplicationOrchestratorSuccessModal
        open
        onClose={vi.fn()}
        applicationName="Finance App"
        orchestratorPush={push}
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
      <RecoveryApplicationOrchestratorSuccessModal
        open
        onClose={vi.fn()}
        applicationName="Finance App"
        orchestratorPush={push}
      />,
    )

    expect(screen.getByText('OrchestratorPush')).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(push.dag_id)).length).toBeGreaterThan(0)
  })
})
