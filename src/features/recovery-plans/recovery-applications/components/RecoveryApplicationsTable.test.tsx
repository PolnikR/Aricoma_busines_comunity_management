import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const application: RecoveryApplicationListItem = {
  id: 'finance-app',
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
          name: 'Database',
          description: 'Database tier',
          order: 1,
          vms: [{ name: 'DB-01' }],
        },
      },
    },
  },
  submission: { status: 'ok', remotePath: '/tmp/finance.json' },
}

describe('RecoveryApplicationsTable', () => {
  it('opens application details using backend data without mock CRUD actions', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationsTable applications={[application]} />)

    await user.click(screen.getByText('Finance Recovery'))
    const drawer = screen.getByRole('dialog', { name: 'Application detail' })
    expect(within(drawer).getByText('/tmp/finance.json')).toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('opens and closes the JSON viewer without selecting the row', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationsTable applications={[application]} />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    const modal = screen.getByRole('dialog', { name: 'Application JSON' })
    expect(within(modal).getByText(/Finance Recovery/)).toBeInTheDocument()

    await user.click(within(modal).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Application JSON' })).not.toBeInTheDocument()
  })
})
