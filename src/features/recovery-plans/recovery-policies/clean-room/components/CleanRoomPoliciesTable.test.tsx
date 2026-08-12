import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CleanRoomPolicy } from '../model/cleanRoomPolicyTypes'
import { CleanRoomPoliciesTable } from './CleanRoomPoliciesTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeleteCleanRoomPolicy', () => ({
  useDeleteCleanRoomPolicy: () => ({ mutate: vi.fn(), isPending: false }),
}))

const policy: CleanRoomPolicy = {
  id: 'enforce-clean-target',
  name: 'Enforce Clean Target',
  description: 'Remove conflicting target resources before recovery.',
  enabled: true,
}

describe('CleanRoomPoliciesTable', () => {
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
})
