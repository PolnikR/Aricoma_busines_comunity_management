import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'

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
    onDirtyChange,
  }: {
    onDirtyChange?: (isDirty: boolean) => void
  }) => (
    <button type="button" onClick={() => { onDirtyChange?.(true) }}>
      Change builder
    </button>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecoveryApplicationBuilderPage', () => {
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
