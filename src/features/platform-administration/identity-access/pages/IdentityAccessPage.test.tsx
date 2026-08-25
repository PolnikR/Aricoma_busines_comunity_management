import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { IdentityAccessPage } from './IdentityAccessPage'
import { identityAccessSectionGroups, identityAccessVisibleSectionIds, type IdentityAccessSectionId } from '../models/identityAccessSections'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../components/UsersSection', () => ({ UsersSection: () => <div>Users content</div> }))
vi.mock('../components/RealmRolesSection', () => ({ RealmRolesSection: () => <div>Realm roles content</div> }))
vi.mock('../components/GroupsSection', () => ({ GroupsSection: () => <div>Groups content</div> }))
vi.mock('../components/ClientsSection', () => ({ ClientsSection: () => <div>Clients content</div> }))
vi.mock('../components/ClientScopesSection', () => ({ ClientScopesSection: () => <div>Client scopes content</div> }))
vi.mock('../components/RealmSettingsSection', () => ({ RealmSettingsSection: () => <div>Realm settings content</div> }))
vi.mock('../components/AuthenticationSection', () => ({ AuthenticationSection: () => <div>Authentication content</div> }))
vi.mock('../components/IdentityProvidersSection', () => ({ IdentityProvidersSection: () => <div>Identity providers content</div> }))
vi.mock('../components/UserFederationSection', () => ({ UserFederationSection: () => <div>User federation content</div> }))
vi.mock('../components/EventsSection', () => ({ EventsSection: ({ onOpenSettings }: { onOpenSettings: () => void }) => <button onClick={onOpenSettings}>Open event settings</button> }))
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
  authentication: 'Authentication content',
  'identity-providers': 'Identity providers content',
  'user-federation': 'User federation content',
  events: 'Open event settings',
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
    expect(screen.queryByTestId('identity-access-realm-context')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Keycloak realm navigation' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Manage' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Configure' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Users content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument()
  })

  it('changes the active section through the URL-backed navigation', async () => {
    renderPage('/platform-administration/identity-access?keep=visible')

    await userEvent.click(screen.getByRole('tab', { name: 'Clients' }))

    expect(screen.getByRole('tab', { name: 'Clients' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Clients content')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveAttribute('data-search', '?keep=visible&section=clients')
    expect(screen.queryByRole('button', { name: 'Create client' })).not.toBeInTheDocument()
  })

  it('navigates from Events to Realm settings > Events atomically', async () => {
    renderPage('/platform-administration/identity-access?section=events&tab=admin-events&keep=visible')

    await userEvent.click(screen.getByRole('button', { name: 'Open event settings' }))

    const params = new URLSearchParams(screen.getByTestId('location-search').getAttribute('data-search') ?? '')
    expect(params.get('section')).toBe('realm-settings')
    expect(params.get('tab')).toBe('events')
    expect(params.get('keep')).toBe('visible')
  })

  it.each(registeredSections)('renders the registered $sectionId section in its $groupLabel group', ({ groupLabel, sectionId, sectionLabel }) => {
    renderPage(`/platform-administration/identity-access?section=${sectionId}`)

    expect(screen.getByRole('tab', { name: groupLabel })).toHaveAttribute('aria-selected', 'true')
    const visibleSectionIds = identityAccessVisibleSectionIds[groupLabel === 'Manage' ? 'manage' : 'configure']
    if (visibleSectionIds.some(visibleSectionId => visibleSectionId === sectionId)) {
      expect(screen.getByRole('tab', { name: sectionLabel })).toHaveAttribute('aria-selected', 'true')
    } else {
      expect(screen.queryByRole('tab', { name: sectionLabel })).not.toBeInTheDocument()
    }

    const content = dataBackedContent[sectionId]
    if (content) {
      expect(screen.getByText(content)).toBeInTheDocument()
      return
    }

    expect(screen.getByRole('heading', { name: sectionLabel, level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Keycloak integration for this administration area is not connected yet.')).toBeInTheDocument()
  })

  it('shows Create client scope action for Client scopes section', () => {
    renderPage('/platform-administration/identity-access?section=client-scopes')
    expect(screen.getByRole('button', { name: 'Create client scope' })).toBeInTheDocument()
  })

  it('shows Add LDAP and Add Kerberos for User federation', () => {
    renderPage('/platform-administration/identity-access?section=user-federation')
    expect(screen.getByRole('button', { name: 'Add LDAP' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Kerberos' })).toBeInTheDocument()
  })

  it('shows disabled danger Sign out action for Sessions', () => {
    renderPage('/platform-administration/identity-access?section=sessions')
    const btn = screen.getByRole('button', { name: 'Sign out all active sessions' })
    expect(btn).toBeDisabled()
  })

  it('does not expose stale integration-gated actions for active preview sections', () => {
    renderPage('/platform-administration/identity-access?section=realm-settings')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

    cleanup()
    renderPage('/platform-administration/identity-access?section=clients')
    expect(screen.queryByRole('button', { name: 'Create client' })).not.toBeInTheDocument()
  })

  it('defaults Authentication to Required actions while retaining the hidden Flows action seam', () => {
    renderPage('/platform-administration/identity-access?section=authentication')
    expect(screen.queryByRole('button', { name: 'Create flow' })).not.toBeInTheDocument()

    cleanup()
    renderPage('/platform-administration/identity-access?section=authentication&tab=required-actions')
    expect(screen.queryByRole('button', { name: 'Create flow' })).not.toBeInTheDocument()

    cleanup()
    renderPage('/platform-administration/identity-access?section=authentication&tab=flows')
    expect(screen.getByRole('button', { name: 'Create flow' })).toBeInTheDocument()
  })
})
