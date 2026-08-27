import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetsTable } from './PolicySetsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const { deleteMutation } = vi.hoisted(() => ({
  deleteMutation: { mutate: vi.fn(), isPending: false, error: null as Error | null },
}))
vi.mock('../hooks/useDeletePolicySet', () => ({ useDeletePolicySet: () => deleteMutation }))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [{ id: 'medium-6h', name: 'Medium — 6h' }],
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies', () => ({
  useRecoveryAppPolicies: () => ({
    data: [{ id: 'critical-daily-latest', name: 'Critical — Daily DR Test' }],
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies', () => ({
  useCleanRoomPolicies: () => ({
    data: [{ id: 'enforce-clean-target', name: 'Enforce Clean Target' }],
  }),
}))

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshotPolicyId: 'medium-6h',
  recoveryAppPolicyId: 'critical-daily-latest',
  cleanRoomPolicyId: 'enforce-clean-target',
}

const partialPolicySet: PolicySet = {
  id: 'tier3-apps',
  name: 'Tier 3 applications',
  description: 'Policy set with only a snapshot policy assigned.',
  snapshotPolicyId: 'medium-6h',
  recoveryAppPolicyId: '',
  cleanRoomPolicyId: '',
}

describe('PolicySetsTable', () => {
  it('keeps its static toolbar and headers visible while policy-set rows load', () => {
    render(
      <PolicySetsTable
        policySets={[]}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search policy sets' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Policies' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Loading policy sets' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
  })

  it('keeps pagination outside a desktop-only table scroll region', () => {
    const { container } = render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    const tableLayout = container.firstElementChild
    const scrollRegion = tableLayout?.children.item(1)

    expect(tableLayout).toHaveClass('min-h-0', 'min-w-0', 'flex-1')
    expect(scrollRegion).toHaveClass('custom-scrollbar', 'min-h-0', 'flex-1', 'lg:overflow-y-auto')
    expect(scrollRegion).not.toHaveClass('overflow-y-auto')
    expect(screen.getByText('Showing 1-1 of 1')).toBeInTheDocument()
  })

  it('shows the policy set and opens an accessible detail drawer with resolved policy names', async () => {
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search policy sets' })).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Tier 2 applications'))
    const detail = screen.getByRole('dialog', { name: 'Policy set detail' })
    expect(detail).toBeInTheDocument()
    expect(within(detail).getByText('Medium — 6h')).toBeInTheDocument()
    expect(within(detail).getByText('Critical — Daily DR Test')).toBeInTheDocument()
    expect(within(detail).getByText('Enforce Clean Target')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the policy set submit payload without opening the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Policy Set JSON' })
    expect(dialog).toHaveTextContent('"snapshot_policy_id": "medium-6h"')
    expect(dialog).toHaveTextContent('"recovery_app_policy_id": "critical-daily-latest"')
    expect(dialog).toHaveTextContent('"clean_room_policy_id": "enforce-clean-target"')
    expect(dialog).not.toHaveTextContent('"snapshotPolicyId"')
    expect(screen.queryByRole('dialog', { name: 'Policy set detail' })).not.toBeInTheDocument()
  })

  it('shows a partial policies count when only some policy types are assigned', () => {
    render(
      <PolicySetsTable
        policySets={[partialPolicySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('keeps table controls available while showing a shared request error', () => {
    render(
      <PolicySetsTable
        policySets={[]}
        isLoading={false}
        error={new Error('private backend details')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('private backend details')
  })

  it('shows supported backend detail in the retryable load state', () => {
    const apiError = new OrvalApiError(503, 'Unavailable', { detail: 'Policy service is unavailable.' })

    render(
      <PolicySetsTable
        policySets={[]}
        isLoading={false}
        error={new Error('Policy set request failed with status 503', { cause: apiError })}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Policy service is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('keeps pagination available when cached policy sets remain after a refresh error', () => {
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={new Error('background refresh failed')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })

  it('closes the confirmation and shows backend detail when delete fails', async () => {
    const user = userEvent.setup()
    deleteMutation.error = null
    deleteMutation.mutate.mockImplementation((_id: string, options: { onError?: (error: Error) => void }) => {
      const apiError = new OrvalApiError(409, 'Conflict', { detail: 'Policy set is still in use.' })
      const error = new Error('Delete policy set request failed with status 409', { cause: apiError })
      deleteMutation.error = error
      options.onError?.(error)
    })

    const view = render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Tier 2 applications'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Delete policy set' })).getByRole('button', { name: 'Delete' }))
    view.rerender(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Delete policy set' })).not.toBeInTheDocument() })
    expect(screen.getByRole('alert')).toHaveTextContent('Policy set is still in use.')
  })
})
