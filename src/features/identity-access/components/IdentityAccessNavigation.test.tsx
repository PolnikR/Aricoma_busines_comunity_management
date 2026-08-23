import { render, screen } from '@testing-library/react'
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
  it('renders only sections from the active group using shared tab semantics', () => {
    renderNavigation()

    expect(screen.getByRole('button', { name: 'Manage' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Configure' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('tablist', { name: 'Manage sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Organizations' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Permissions' })).not.toBeInTheDocument()
  })

  it('delegates group switching to the URL-backed selection contract', async () => {
    const props = renderNavigation()

    await userEvent.click(screen.getByRole('button', { name: 'Configure' }))

    expect(props.onGroupChange).toHaveBeenCalledWith('configure')
  })

  it('delegates section selection from the active horizontal tab row', async () => {
    const props = renderNavigation({ groupId: 'configure', sectionId: 'realm-settings' })

    expect(screen.getByRole('tablist', { name: 'Configure sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Realm settings' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Users' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Permissions' }))

    expect(props.onSectionChange).toHaveBeenCalledWith('permissions')
  })
})
