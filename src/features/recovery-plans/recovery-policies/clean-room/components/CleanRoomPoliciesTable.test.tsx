import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { CleanRoomPolicyRecordOutput } from '@/generated/query/zod'
import { CleanRoomPoliciesTable } from './CleanRoomPoliciesTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/clean-room-policies/clean-room-policies.gen', () => ({
  useDeleteCleanRoomPolicy: () => ({ mutate: vi.fn(), isPending: false }),
  useSubmitCleanRoomPolicy: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const policy: CleanRoomPolicyRecordOutput = {
  id: 'enforce-clean-target',
  name: 'Enforce Clean Target',
  description: 'Remove conflicting target resources before recovery.',
  enabled: true,
}

describe('CleanRoomPoliciesTable', () => {
  it('renders an empty-string description as a dash', () => {
    render(
      <CleanRoomPoliciesTable
        policies={[{ ...policy, description: '' }]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })


  it('keeps the toolbar and real column labels visible while rows load', () => {
    render(
      <CleanRoomPoliciesTable
        policies={[]}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('region', { name: 'Clean room policies table' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search clean room policies' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Policy' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Loading clean room policies' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
  })

  it('shows policies and opens an accessible detail drawer', async () => {
    render(
      <CleanRoomPoliciesTable
        policies={[policy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search clean room policies' })).toBeInTheDocument()
    expect(screen.getByText('Enabled')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Enforce Clean Target'))
    const drawer = screen.getByRole('dialog', { name: 'Clean room policy detail' })
    expect(within(drawer).getByText('Remove conflicting target resources before recovery.')).toBeInTheDocument()
    const modelCDrawer = screen.getByRole('dialog', { name: 'Clean room policy detail' })
    const modelCHeader = within(modelCDrawer).getByRole('heading', { level: 2, name: 'Enforce Clean Target' }).closest('header')
    expect(modelCHeader).toHaveTextContent('Clean room policy')
    // A simple record is one section: no section navigation, the ID in a technical group.
    expect(modelCDrawer).toHaveAttribute('data-size', 'md')
    expect(within(modelCDrawer).queryByRole('navigation')).not.toBeInTheDocument()
    expect(modelCHeader).not.toHaveTextContent(/[a-z0-9]+-[a-z0-9-]+$/)
    const modelCDelete = within(modelCDrawer).getByRole('button', { name: 'Delete' })
    expect(modelCDelete.closest('footer')?.children[0]).toContainElement(modelCDelete)
    expect(modelCDelete.closest('footer')?.children[1]).toContainElement(within(modelCDrawer).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(modelCDrawer).getByRole('button', { name: 'Clean room policy help' }))
    expect(within(modelCDrawer).getByRole('dialog', { name: 'How a clean room policy works' })).toHaveTextContent('Conflicting resources')
    expect(within(drawer).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(within(drawer).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the clean room submit payload without opening the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <CleanRoomPoliciesTable
        policies={[policy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Clean Room Policy JSON' })
    expect(dialog).toHaveTextContent('"id": "enforce-clean-target"')
    expect(dialog).toHaveTextContent('"enabled": true')
    expect(screen.queryByRole('dialog', { name: 'Clean room policy detail' })).not.toBeInTheDocument()
  })

  it('keeps controls available while rendering a shared request error', () => {
    render(
      <CleanRoomPoliciesTable
        policies={[]}
        isLoading={false}
        error={new Error('private backend details')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('private backend details')
  })

  it('shows supported backend detail in the load error', () => {
    render(<CleanRoomPoliciesTable policies={[]} isLoading={false} error={new OrvalApiError(503, 'Unavailable', { detail: 'Clean room service unavailable.' })} isRetrying={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Clean room service unavailable.')
  })

  it('keeps pagination available when cached policies remain after a refresh error', () => {
    render(<CleanRoomPoliciesTable policies={[policy]} isLoading={false} error={new Error('background refresh failed')} isRetrying={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })
})
