import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAccessNavigation } from './IdentityAccessNavigation'

function renderNavigation(overrides?: Partial<Parameters<typeof IdentityAccessNavigation>[0]>) {
  const props: Parameters<typeof IdentityAccessNavigation>[0] = {
    groupId: 'manage',
    sectionId: 'users',
    onGroupChange: vi.fn(),
    onSectionChange: vi.fn(),
    ...overrides,
  }

  render(<IdentityAccessNavigation {...props} />)
  return props
}

describe('IdentityAccessNavigation', () => {
  it('renders only visible Manage sections using shared tab semantics', () => {
    renderNavigation()

    expect(screen.getByRole('tab', { name: 'Manage' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'false')
    const sectionTabs = within(screen.getByRole('tablist', { name: 'Manage sections' }))
    expect(sectionTabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Users', 'Clients', 'Realm roles'])
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')
  })

  it('delegates group switching to the URL-backed selection contract', async () => {
    const props = renderNavigation()

    await userEvent.click(screen.getByRole('tab', { name: 'Configure' }))

    expect(props.onGroupChange).toHaveBeenCalledWith('configure')
  })

  it('renders only visible Configure sections and delegates their selection', async () => {
    const props = renderNavigation({ groupId: 'configure', sectionId: 'realm-settings' })

    const sectionTabs = within(screen.getByRole('tablist', { name: 'Configure sections' }))
    expect(sectionTabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Realm settings', 'Authentication', 'Permissions'])
    expect(screen.getByRole('tab', { name: 'Realm settings' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Users' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Authentication' }))

    expect(props.onSectionChange).toHaveBeenCalledWith('authentication')
  })
})
