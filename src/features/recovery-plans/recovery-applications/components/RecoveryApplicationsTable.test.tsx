import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const application: RecoveryApplicationListItem = {
  id: 'finance-app',
  policySetId: 'critical-daily-latest',
  airflowRunId: '260811133132_fbffbefb',
  pushToOrchestrator: true,
  data: {
    application: {
      name: 'Finance Recovery',
      description: 'Finance workloads',
      environment: 'prod',
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {
        database: {
          description: 'Database tier',
          order: 1,
          recovery_group: {
            name: 'database_group',
            description: 'Database recovery group',
            vms: [{ name: 'DB-01' }],
          },
        },
      },
    },
  },
  submission: { status: 'ok', remotePath: '/tmp/finance.json' },
}

const developmentApplication: RecoveryApplicationListItem = {
  id: 'development-app',
  data: {
    application: {
      name: 'Development Recovery',
      description: 'Development workloads',
      environment: 'dev',
      platform: 'IBM PowerVM',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {},
    },
  },
}

describe('RecoveryApplicationsTable', () => {
  it('shows generated response contract diagnostics in the request error state', () => {
    render(
      <RecoveryApplicationsTable
        applications={[]}
        error={new Error('GET /get_recovery_apps response does not match OpenAPI: applications: expected array')}
      />,
    )

    expect(screen.getByText(/applications: expected array/)).toBeInTheDocument()
  })

  it('opens backend application details and dispatches Edit without Delete', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<RecoveryApplicationsTable applications={[application]} onEdit={onEdit} />)

    await user.click(screen.getByText('Finance Recovery'))
    const drawer = screen.getByRole('dialog', { name: 'Application detail' })
    expect(within(drawer).getByText('/tmp/finance.json')).toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('finance-app')
  })

  it('opens and closes the JSON viewer without selecting the row', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationsTable applications={[application]} />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    const modal = screen.getByRole('dialog', { name: 'Application JSON' })
    expect(within(modal).getByText(/Finance Recovery/)).toBeInTheDocument()
    expect(within(modal).getByText(/"id": "finance-app"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"policy_set_id": "critical-daily-latest"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"airflow_run_id": "260811133132_fbffbefb"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"push_to_orchestrator": true/)).toBeInTheDocument()

    await user.click(within(modal).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Application JSON' })).not.toBeInTheDocument()
  })

  it('filters applications by environment and platform and reports the active count', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationsTable applications={[application, developmentApplication]} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const modal = screen.getByRole('dialog', { name: 'Filter recovery applications' })
    await user.selectOptions(within(modal).getByLabelText('Environment'), 'dev')
    await user.selectOptions(within(modal).getByLabelText('Platform'), 'IBM PowerVM')
    await user.click(within(modal).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
    expect(screen.queryByText('Finance Recovery')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filters 2/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filters 2/ }))
    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
  })

  it('does not apply pending filter changes when the modal is cancelled', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationsTable applications={[application, developmentApplication]} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const modal = screen.getByRole('dialog', { name: 'Filter recovery applications' })
    await user.selectOptions(within(modal).getByLabelText('Environment'), 'prod')
    await user.click(within(modal).getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
  })
})
