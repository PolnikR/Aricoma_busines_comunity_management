import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import type { RecoveryGroupListItem } from '../model/recoveryGroupTypes'
import { RecoveryGroupsTable } from './RecoveryGroupsTable'

const groups: RecoveryGroupListItem[] = [
  {
    id: 'database-group',
    name: 'Database group',
    description: 'Primary database virtual machines',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    resourceCount: 2,
    status: 'Active',
  },
]

describe('RecoveryGroupsTable', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  it('renders group columns and opens the group detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} />
      </LanguageProvider>,
    )

    expect(await screen.findByText('Recovery Group')).toBeInTheDocument()
    expect(screen.getByText('Workload Type')).toBeInTheDocument()
    expect(screen.getByText('Resource Type')).toBeInTheDocument()

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Database group' })).toBeInTheDocument()
  })

  it('filters groups by search text', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} />
      </LanguageProvider>,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search recovery groups' })
    await user.type(search, 'missing')

    expect(screen.getByText('No recovery groups defined yet')).toBeInTheDocument()
  })

  it('edits and confirms deletion from the detail panel', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <LanguageProvider>
        <RecoveryGroupsTable groups={groups} onEdit={onEdit} onDelete={onDelete} />
      </LanguageProvider>,
    )

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('database-group')

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery group' })
    expect(confirmDialog).toHaveTextContent('Database group')

    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith('database-group')
  })
})
