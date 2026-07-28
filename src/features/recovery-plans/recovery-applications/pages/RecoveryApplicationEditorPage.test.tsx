import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
import type {
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
} from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const mutate = vi.fn()
const refetch = vi.fn()

const application: RecoveryApplicationListItem = {
  id: 'Finance App.json',
  data: {
    application: {
      name: 'Finance App',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {
        database: {
          name: 'Database',
          order: 1,
          description: 'Database tier',
          vms: [{ name: 'db-01' }],
        },
      },
    },
  },
}

let recoveryQuery: {
  data: RecoveryApplicationListItem[] | undefined
  isLoading: boolean
  error: Error | null
  isFetching: boolean
  refetch: typeof refetch
}

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'Finance App.json' }),
  }
})

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../api/useRecoveryApplications', () => ({
  useRecoveryApplications: () => recoveryQuery,
  useSubmitRecoveryApplication: () => ({
    mutate,
    error: null,
    isPending: false,
  }),
}))

vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: ({
    initialData,
    onSave,
  }: {
    initialData: RecoveryApplicationFormState
    onSave: (state: RecoveryApplicationFormState) => void
  }) => (
    <div>
      <span>{initialData.name}</span>
      <button type="button" onClick={() => { onSave(initialData) }}>Save unchanged</button>
      <button
        type="button"
        onClick={() => { onSave({ ...initialData, name: 'Renamed App' }) }}
      >
        Save renamed
      </button>
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  recoveryQuery = {
    data: [application],
    isLoading: false,
    error: null,
    isFetching: false,
    refetch,
  }
})

describe('RecoveryApplicationEditorPage', () => {
  it('prefills backend data and submits an unchanged filename', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Finance App')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        application: expect.objectContaining({ name: 'Finance App' }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('submits the changed filename and leaves create-versus-update to the backend', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Save renamed' }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        application: expect.objectContaining({ name: 'Renamed App' }),
      }),
      expect.any(Object),
    )
  })

  it('renders loading, load-error, and not-found states', () => {
    recoveryQuery = { ...recoveryQuery, data: undefined, isLoading: true }
    const { rerender } = render(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading recovery application')

    recoveryQuery = {
      ...recoveryQuery,
      isLoading: false,
      error: new Error('Backend unavailable'),
    }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable')

    recoveryQuery = { ...recoveryQuery, data: [], error: null }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Recovery application not found')).toBeInTheDocument()
  })
})
