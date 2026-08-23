import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAccessPage } from './IdentityAccessPage'

vi.mock('../components/UsersSection', () => ({ UsersSection: () => <div>Users content</div> }))
vi.mock('../components/RealmRolesSection', () => ({ RealmRolesSection: () => <div>Realm roles content</div> }))
vi.mock('../components/PermissionsSection', () => ({ PermissionsSection: () => <div>Permissions content</div> }))
vi.mock('../components/OrganizationsSection', () => ({ OrganizationsSection: () => <div>Organizations content</div> }))
vi.mock('../components/SessionsSection', () => ({ SessionsSection: () => <div>Sessions content</div> }))

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
    expect(screen.getByTestId('identity-access-realm-context')).toHaveTextContent('Realm')
    expect(screen.getByTestId('identity-access-realm-context')).toHaveTextContent('ABCO')
    expect(screen.getByTestId('identity-access-realm-context')).toHaveTextContent('Keycloak realm administration')
    expect(screen.getByRole('navigation', { name: 'Keycloak realm navigation' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Manage' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Users content')).toBeInTheDocument()
  })

  it('changes the active section through the URL-backed navigation', async () => {
    renderPage('/platform-administration/identity-access?keep=visible')

    await userEvent.click(screen.getByRole('tab', { name: 'Realm roles' }))

    expect(screen.getByRole('tab', { name: 'Realm roles' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Realm roles content')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveAttribute('data-search', '?keep=visible&section=realm-roles')
  })

  it.each([
    ['users', 'Users content'],
    ['realm-roles', 'Realm roles content'],
    ['organizations', 'Organizations content'],
    ['sessions', 'Sessions content'],
    ['permissions', 'Permissions content'],
  ])('renders the data-backed %s section', (sectionId, content) => {
    renderPage(`/platform-administration/identity-access?section=${sectionId}`)

    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it.each([
    ['clients', 'Clients'],
    ['client-scopes', 'Client scopes'],
    ['groups', 'Groups'],
    ['events', 'Events'],
    ['realm-settings', 'Realm settings'],
    ['authentication', 'Authentication'],
    ['identity-providers', 'Identity providers'],
    ['user-federation', 'User federation'],
    ['workflows', 'Workflows'],
  ])('renders a truthful shared placeholder for %s', (sectionId, label) => {
    renderPage(`/platform-administration/identity-access?section=${sectionId}`)

    expect(screen.getByRole('heading', { name: label, level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Keycloak integration for this administration area is not connected yet.')).toBeInTheDocument()
  })
})
