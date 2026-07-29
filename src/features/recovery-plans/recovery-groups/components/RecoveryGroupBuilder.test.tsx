import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const existingGroup: RecoveryGroup = {
  id: 'database_group',
  name: 'Database group',
  description: 'Production databases',
  sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines',
  resourceType: 'vm',
  resources: ['DB-01'],
  resourceCount: 1,
  status: 'Active',
}

describe('RecoveryGroupBuilder', () => {
  it('reports unsaved changes when group details change', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()

    render(
      <RecoveryGroupBuilder
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )

    await user.type(screen.getByLabelText('Group name *'), 'Database group')

    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('locks the resource configuration while editing an existing group', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Resource type' }))

    expect(screen.getByRole('button', { name: /VMware virtual machines/i })).toBeDisabled()
    await user.click(screen.getByRole('tab', { name: 'Storage system' }))
    expect(screen.getByRole('button', { name: /VMware virtual machines/i })).toBeInTheDocument()
  })
})
