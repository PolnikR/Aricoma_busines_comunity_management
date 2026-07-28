import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import type { RecoveryGroupListItem } from '../model/recoveryGroupTypes'
import { RecoveryGroupsTable } from './RecoveryGroupsTable'

const groups: RecoveryGroupListItem[] = [
  {
    id: 'database-group',
    name: 'Database group',
    description: 'Primary database virtual machines',
    workloadType: 'VMware',
    resourceType: 'VM',
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
        <RecoveryGroupsTable groups={groups} />
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
        <RecoveryGroupsTable groups={groups} />
      </LanguageProvider>,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search recovery groups' })
    await user.type(search, 'missing')

    expect(screen.getByText('No recovery groups defined yet')).toBeInTheDocument()
  })
})
