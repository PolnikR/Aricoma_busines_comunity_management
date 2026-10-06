import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { RecoveryAppPolicyRecordOutput } from '@/generated/query/zod'
import { RecoveryAppPoliciesTable } from './RecoveryAppPoliciesTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({
  useDeleteRecoveryAppPolicy: () => ({ mutate: vi.fn(), isPending: false }),
  useSubmitRecoveryAppPolicy: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const policy: RecoveryAppPolicyRecordOutput = {
  id: 'medium-monthly-exacttime', name: 'Medium monthly', description: 'Monthly test.', level: 'medium',
  frequency_value: 30, frequency_unit: 'days', retention_value: 2, retention_unit: 'days', boot_verify: false,
  snapshot_selection_mode: 'exact_time', snapshot_max_age_value: null, snapshot_max_age_unit: null,
  snapshot_target_time: '02:00', enabled: true,
}

const latestPolicy: RecoveryAppPolicyRecordOutput = {
  ...policy,
  id: 'critical-latest',
  name: 'Critical latest',
  level: 'critical',
  snapshot_selection_mode: 'latest',
  snapshot_target_time: null,
}

describe('RecoveryAppPoliciesTable', () => {
  it('renders an empty-string description as a dash', () => {
    render(
      <RecoveryAppPoliciesTable
        policies={[{ ...policy, description: '' }]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })


  it('keeps static table content visible and dependent filters disabled while rows load', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppPoliciesTable policies={[]} isLoading error={null} isRetrying={false} onRetry={vi.fn()} />)

    expect(screen.getByRole('region', { name: 'Recovery app policies table' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search recovery app policies' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Policy' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Snapshot selection' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Loading recovery app policies' })).toHaveAttribute('aria-busy', 'true')

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    expect(screen.getByLabelText('Level')).toBeDisabled()
    expect(screen.getByLabelText('Status')).toBeDisabled()
    expect(screen.getByLabelText('Selection mode')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
  })

  it('shows schedule selection and opens an accessible detail drawer', async () => {
    render(<RecoveryAppPoliciesTable policies={[policy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Search recovery app policies' })).toBeInTheDocument()
    expect(screen.getByText('Every 30 days')).toBeInTheDocument()
    expect(screen.getByText('Closest to 02:00')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Medium monthly'))
    expect(screen.getByRole('dialog', { name: 'Recovery app policy detail' })).toBeInTheDocument()
    const modelCDrawer = screen.getByRole('dialog', { name: 'Recovery app policy detail' })
    const modelCHeader = within(modelCDrawer).getByRole('heading', { level: 2, name: 'Medium monthly' }).closest('header')
    expect(modelCHeader).toHaveTextContent('Recovery app policy')
    // A simple record is one section: no section navigation, the ID in a technical group.
    expect(modelCDrawer).toHaveAttribute('data-size', 'md')
    expect(within(modelCDrawer).queryByRole('navigation')).not.toBeInTheDocument()
    expect(modelCHeader).not.toHaveTextContent(/[a-z0-9]+-[a-z0-9-]+$/)
    const modelCDelete = within(modelCDrawer).getByRole('button', { name: 'Delete' })
    expect(modelCDelete.closest('footer')?.children[0]).toContainElement(modelCDelete)
    expect(modelCDelete.closest('footer')?.children[1]).toContainElement(within(modelCDrawer).getByRole('button', { name: 'Edit' }))
    await userEvent.click(within(modelCDrawer).getByRole('button', { name: 'Recovery app policy help' }))
    expect(screen.getByRole('dialog', { name: 'How a recovery app policy works' })).toHaveTextContent('Schedule')
  })

  it('shows the complete recovery policy GET payload without opening the drawer', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppPoliciesTable policies={[policy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Application Recovery Policy JSON' })
    expect(dialog).toHaveTextContent('"snapshot_selection_mode": "exact_time"')
    expect(dialog).toHaveTextContent('"snapshot_target_time": "02:00"')
    expect(dialog).toHaveTextContent('"snapshot_max_age_value": null')
    expect(dialog).toHaveTextContent('"snapshot_max_age_unit": null')
    expect(dialog).not.toHaveTextContent('"snapshotTargetTime"')
    expect(screen.queryByRole('dialog', { name: 'Recovery app policy detail' })).not.toBeInTheDocument()
  })

  it('keeps nullable selection fields in latest policy JSON', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppPoliciesTable policies={[latestPolicy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Application Recovery Policy JSON' })
    expect(dialog).toHaveTextContent('"snapshot_selection_mode": "latest"')
    expect(dialog).toHaveTextContent('"snapshot_max_age_value": null')
    expect(dialog).toHaveTextContent('"snapshot_max_age_unit": null')
    expect(dialog).toHaveTextContent('"snapshot_target_time": null')
  })

  it('filters by snapshot selection mode', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppPoliciesTable policies={[policy, latestPolicy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter recovery app policies' })
    await user.selectOptions(within(dialog).getByLabelText('Selection mode'), 'latest')
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Critical latest')).toBeInTheDocument()
    expect(screen.queryByText('Medium monthly')).not.toBeInTheDocument()
  })

  it('shows supported backend detail in the load error', () => {
    render(<RecoveryAppPoliciesTable policies={[]} isLoading={false} error={new OrvalApiError(503, 'Unavailable', { detail: 'Recovery policy service unavailable.' })} isRetrying={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Recovery policy service unavailable.')
  })

  it('keeps pagination available when cached policies remain after a refresh error', () => {
    render(<RecoveryAppPoliciesTable policies={[policy]} isLoading={false} error={new Error('background refresh failed')} isRetrying={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })
})
