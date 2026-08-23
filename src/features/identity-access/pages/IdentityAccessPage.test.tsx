import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAccessPage } from './IdentityAccessPage'
import { identityAccessSectionGroups, type IdentityAccessSectionId } from '../models/identityAccessSections'

vi.mock('../components/UsersSection', () => ({ UsersSection: () => <div>Users content</div> }))
vi.mock('../components/RealmRolesSection', () => ({ RealmRolesSection: () => <div>Realm roles content</div> }))
vi.mock('../components/GroupsSection', () => ({ GroupsSection: () => <div>Groups content</div> }))
vi.mock('../components/ClientsSection', () => ({ ClientsSection: () => <div>Clients content</div> }))
vi.mock('../components/ClientScopesSection', () => ({ ClientScopesSection: () => <div>Client scopes content</div> }))
vi.mock('../components/RealmSettingsSection', () => ({ RealmSettingsSection: () => <div>Realm settings content</div> }))
vi.mock('../components/PermissionsSection', () => ({ PermissionsSection: () => <div>Permissions content</div> }))
vi.mock('../components/OrganizationsSection', () => ({ OrganizationsSection: () => <div>Organizations content</div> }))
vi.mock('../components/SessionsSection', () => ({ SessionsSection: () => <div>Sessions content</div> }))

const dataBackedContent: Partial<Record<IdentityAccessSectionId, string>> = {
  users: 'Users content',
  'realm-roles': 'Realm roles content',
  groups: 'Groups content',
  clients: 'Clients content',
  'client-scopes': 'Client scopes content',
  'realm-settings': 'Realm settings content',
  organizations: 'Organizations content',
  sessions: 'Sessions content',
  permissions: 'Permissions content',
}

const registeredSections = identityAccessSectionGroups.flatMap(group => group.sections.map(section => ({
  groupLabel: group.label,
  sectionId: section.id,
  sectionLabel: section.label,
})))

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

  it.each(registeredSections)('renders the registered $sectionId section in its $groupLabel group', ({ groupLabel, sectionId, sectionLabel }) => {
    renderPage(`/platform-administration/identity-access?section=${sectionId}`)

    expect(screen.getByRole('tab', { name: groupLabel })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: sectionLabel })).toHaveAttribute('aria-selected', 'true')

    const content = dataBackedContent[sectionId]
    if (content) {
      expect(screen.getByText(content)).toBeInTheDocument()
      return
    }

    expect(screen.getByRole('heading', { name: sectionLabel, level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Keycloak integration for this administration area is not connected yet.')).toBeInTheDocument()
  })
})
