export const identityAccessSectionGroups = [
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
] as const

export type IdentityAccessSectionGroup = (typeof identityAccessSectionGroups)[number]
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
