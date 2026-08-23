import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAccessPage } from './IdentityAccessPage'

vi.mock('../components/UsersSection', () => ({ UsersSection: () => <div>Users content</div> }))
vi.mock('../components/RealmRolesSection', () => ({ RealmRolesSection: () => <div>Realm roles content</div> }))
vi.mock('../components/PermissionsTab', () => ({ PermissionsTab: () => <div>Permissions content</div> }))
vi.mock('../components/OrganizationsTab', () => ({ OrganizationsTab: () => <div>Organizations content</div> }))
vi.mock('../components/SessionsTab', () => ({ SessionsTab: () => <div>Sessions content</div> }))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location-search" data-search={location.search}>{location.search}</output>
}

function renderPage(entry = '/platform-administration/identity-access') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <IdentityAccessPage />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('IdentityAccessPage', () => {
  it('renders the Keycloak explorer navigation with Users selected by default', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Identity & Access', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Keycloak realm navigation' })).toBeInTheDocument()
    expect(screen.getByText('Manage')).toBeInTheDocument()
    expect(screen.getByText('Configure')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Users content')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('changes the active section through the URL-backed navigation', async () => {
    renderPage('/platform-administration/identity-access?keep=visible')

    await userEvent.click(screen.getByRole('button', { name: 'Realm roles' }))

    expect(screen.getByRole('button', { name: 'Realm roles' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Realm roles content')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveAttribute('data-search', '?keep=visible&section=realm-roles')
  })

  it('renders an integration-pending seam for sections without current mock content', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Clients' }))

    expect(screen.getByRole('button', { name: 'Clients' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Clients', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Keycloak integration for this section is not connected yet.')).toBeInTheDocument()
  })
})
