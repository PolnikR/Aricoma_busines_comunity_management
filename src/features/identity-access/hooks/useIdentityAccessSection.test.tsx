import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import {
  getIdentityAccessDefaultSectionForGroup,
  getIdentityAccessGroupForSection,
  identityAccessSectionGroups,
} from '../models/identityAccessSections'
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
        defaultSectionId: 'users',
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
        defaultSectionId: 'realm-settings',
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

  it('resolves each section to exactly one group and exposes deterministic group defaults', () => {
    const sectionIds = identityAccessSectionGroups.flatMap(group => group.sections.map(section => section.id))

    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    expect(sectionIds.every(sectionId => getIdentityAccessGroupForSection(sectionId).sections.some(section => section.id === sectionId))).toBe(true)
    expect(getIdentityAccessGroupForSection('users').id).toBe('manage')
    expect(getIdentityAccessGroupForSection('permissions').id).toBe('configure')
    expect(getIdentityAccessDefaultSectionForGroup('manage')).toBe('users')
    expect(getIdentityAccessDefaultSectionForGroup('configure')).toBe('realm-settings')
  })

  it('defaults missing and invalid section values to users', () => {
    const missing = renderHook(() => useSectionState(), { wrapper: wrapperFor('/identity-access?keep=1') })
    expect(missing.result.current.sectionId).toBe('users')
    missing.unmount()

    const invalid = renderHook(() => useSectionState(), { wrapper: wrapperFor('/identity-access?section=unknown&keep=1') })
    expect(invalid.result.current.sectionId).toBe('users')
  })

  it('reads a valid section from the URL and derives its group', () => {
    const { result } = renderHook(() => useSectionState(), {
      wrapper: wrapperFor('/identity-access?section=realm-roles'),
    })

    expect(result.current.sectionId).toBe('realm-roles')
    expect(result.current.groupId).toBe('manage')
  })

  it('switches groups through deterministic section defaults without adding parallel state', () => {
    const { result } = renderHook(() => useSectionState(), {
      wrapper: wrapperFor('/identity-access?section=sessions&keep=visible'),
    })

    act(() => { result.current.setGroupId('configure') })
    expect(result.current.sectionId).toBe('realm-settings')
    expect(result.current.groupId).toBe('configure')
    expect(new URLSearchParams(result.current.location.search).get('keep')).toBe('visible')

    act(() => { result.current.setGroupId('manage') })
    expect(result.current.sectionId).toBe('users')
    expect(result.current.groupId).toBe('manage')

    act(() => { void result.current.navigate(-1) })
    expect(result.current.sectionId).toBe('realm-settings')
    expect(result.current.groupId).toBe('configure')
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
