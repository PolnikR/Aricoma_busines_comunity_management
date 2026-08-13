import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import type {
  RecoveryApplicationFormState,
  SubmitDagResponse,
} from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const mutate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useBlocker: () => ({ state: 'unblocked' as const }),
  }
})

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../hooks/useRecoveryApplications', () => ({
  useSubmitRecoveryApplication: () => ({
    mutate,
    error: null,
    isPending: false,
  }),
}))

vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: ({
    onSave,
    onDirtyChange,
  }: {
    onSave?: (state: RecoveryApplicationFormState) => void
    onDirtyChange?: (isDirty: boolean) => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          onSave?.({
            fileName: 'finance_recovery',
            policySetId: 'test_1_hour_ps',
            pushToOrchestrator: false,
            name: 'Finance',
            description: 'Finance recovery',
            environment: 'prod',
            platform: 'vmware-01',
            orchestrationProviderId: 'airflow-01',
            sourceConnection: 'vcenter_default',
            targetConnection: 'vcenter_default_destination',
            tiers: new Map(),
          })
        }}
      >
        Save fixture
      </button>
      <button
        type="button"
        onClick={() => {
          onSave?.({
            fileName: 'finance_recovery',
            policySetId: 'test_1_hour_ps',
            pushToOrchestrator: true,
            name: 'Finance',
            description: 'Finance recovery',
            environment: 'prod',
            platform: 'vmware-01',
            orchestrationProviderId: 'airflow-01',
            sourceConnection: 'vcenter_default',
            targetConnection: 'vcenter_default_destination',
            tiers: new Map(),
          })
        }}
      >
        Save orchestrated fixture
      </button>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>
        Change builder
      </button>
    </>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecoveryApplicationBuilderPage', () => {
  it('submits the selected platform provider ID', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save fixture' }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'airflow-01' }),
      expect.any(Object),
    )
  })

  it('returns to the list after a local-only submit response', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save fixture' }))
    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({ applications: [] })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('shows orchestrator details and waits for close after an orchestrated submit', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save orchestrated fixture' }))
    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({
      applications: [],
      orchestrator_push: {
        status: 'pushed',
        dag: '/home/airflow/dags/finance.py',
        json: '/home/airflow/dags/finance.json',
        dag_id: 'dag_finance',
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('/home/airflow/dags/finance.py')).toBeInTheDocument()
    expect(screen.getByText('/home/airflow/dags/finance.json')).toBeInTheDocument()
    expect(screen.getByText('dag_finance')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('navigates back immediately when the builder is unchanged', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the builder open when discarding changes is cancelled', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Change builder' })).toBeInTheDocument()
  })

  it('discards changes and returns to the table after confirmation', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })
})
