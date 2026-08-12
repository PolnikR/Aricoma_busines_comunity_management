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
    expect(screen.getByText(push.status)).toBeInTheDocument()
    expect(screen.getByText(push.dag)).toBeInTheDocument()
    expect(screen.getByText(push.json)).toBeInTheDocument()
    expect(screen.getByText(push.dag_id)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
