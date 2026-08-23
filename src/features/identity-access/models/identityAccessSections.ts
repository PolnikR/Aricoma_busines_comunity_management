export const identityAccessSectionGroups = [
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
] as const

export type IdentityAccessSectionGroup = (typeof identityAccessSectionGroups)[number]
export type IdentityAccessSectionGroupId = IdentityAccessSectionGroup['id']
export type IdentityAccessSection = IdentityAccessSectionGroup['sections'][number]
export type IdentityAccessSectionId = IdentityAccessSection['id']

const identityAccessSectionIds = new Set<IdentityAccessSectionId>(
  identityAccessSectionGroups.flatMap(group => group.sections.map(section => section.id)),
)

export const DEFAULT_IDENTITY_ACCESS_SECTION: IdentityAccessSectionId = 'users'

export function parseIdentityAccessSection(value: string | null): IdentityAccessSectionId {
  return value && identityAccessSectionIds.has(value as IdentityAccessSectionId)
    ? value as IdentityAccessSectionId
    : DEFAULT_IDENTITY_ACCESS_SECTION
}

export function getIdentityAccessGroup(groupId: IdentityAccessSectionGroupId): IdentityAccessSectionGroup {
  return identityAccessSectionGroups.find(group => group.id === groupId) ?? identityAccessSectionGroups[0]
}

export function getIdentityAccessGroupForSection(sectionId: IdentityAccessSectionId): IdentityAccessSectionGroup {
  return identityAccessSectionGroups.find(group => group.sections.some(section => section.id === sectionId))
    ?? identityAccessSectionGroups[0]
}

export function getIdentityAccessDefaultSectionForGroup(groupId: IdentityAccessSectionGroupId): IdentityAccessSectionId {
  return getIdentityAccessGroup(groupId).defaultSectionId
}
