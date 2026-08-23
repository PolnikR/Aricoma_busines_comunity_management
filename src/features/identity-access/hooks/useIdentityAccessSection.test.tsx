import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { identityAccessSectionGroups } from '../models/identityAccessSections'
import { useIdentityAccessSection } from './useIdentityAccessSection'

function wrapperFor(entry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  )
}

function useSectionState() {
  const section = useIdentityAccessSection()
  const location = useLocation()
  const navigate = useNavigate()
  return { ...section, location, navigate }
}

describe('useIdentityAccessSection', () => {
  it('exposes the approved Keycloak section registry', () => {
    expect(identityAccessSectionGroups).toEqual([
      {
        id: 'manage',
        label: 'Manage',
        sections: [
          { id: 'organizations', label: 'Organizations' },
          { id: 'clients', label: 'Clients' },
          { id: 'client-scopes', label: 'Client scopes' },
          { id: 'realm-roles', label: 'Realm roles' },
          { id: 'users', label: 'Users' },
          { id: 'groups', label: 'Groups' },
          { id: 'sessions', label: 'Sessions' },
          { id: 'events', label: 'Events' },
        ],
      },
      {
        id: 'configure',
        label: 'Configure',
        sections: [
          { id: 'realm-settings', label: 'Realm settings' },
          { id: 'authentication', label: 'Authentication' },
          { id: 'permissions', label: 'Permissions' },
          { id: 'identity-providers', label: 'Identity providers' },
          { id: 'user-federation', label: 'User federation' },
          { id: 'workflows', label: 'Workflows' },
        ],
      },
    ])
  })

  it('defaults missing and invalid section values to users', () => {
    const missing = renderHook(() => useSectionState(), { wrapper: wrapperFor('/identity-access?keep=1') })
    expect(missing.result.current.sectionId).toBe('users')
    missing.unmount()

    const invalid = renderHook(() => useSectionState(), { wrapper: wrapperFor('/identity-access?section=unknown&keep=1') })
    expect(invalid.result.current.sectionId).toBe('users')
  })

  it('reads a valid section from the URL', () => {
    const { result } = renderHook(() => useSectionState(), {
      wrapper: wrapperFor('/identity-access?section=realm-roles'),
    })

    expect(result.current.sectionId).toBe('realm-roles')
  })

  it('changes only the section search parameter and supports browser history', () => {
    const { result } = renderHook(() => useSectionState(), {
      wrapper: wrapperFor('/identity-access?section=users&keep=visible'),
    })

    act(() => { result.current.setSectionId('realm-roles') })
    expect(result.current.sectionId).toBe('realm-roles')
    expect(new URLSearchParams(result.current.location.search).get('keep')).toBe('visible')

    act(() => { result.current.setSectionId('sessions') })
    expect(result.current.sectionId).toBe('sessions')

    act(() => { void result.current.navigate(-1) })
    expect(result.current.sectionId).toBe('realm-roles')
  })
})
