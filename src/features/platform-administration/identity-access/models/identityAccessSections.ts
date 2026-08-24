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

export const identityAccessVisibleSectionIds = {
  manage: ['users', 'clients', 'realm-roles'],
  configure: ['realm-settings', 'authentication', 'permissions'],
} as const satisfies Record<IdentityAccessSectionGroupId, readonly IdentityAccessSectionId[]>

const identityAccessSectionNavigationDefinitions = {
  users: { entity: true, defaultTab: 'details', tabs: ['details', 'attributes', 'credentials', 'role-mappings', 'groups', 'consents', 'sessions', 'identity-provider-links'] },
  clients: { entity: true, defaultTab: 'settings', tabs: ['settings', 'keys', 'credentials', 'roles', 'client-scopes', 'authorization', 'service-accounts-roles', 'sessions', 'permissions'] },
  'client-scopes': { entity: true, defaultTab: 'settings', tabs: ['settings', 'mappers', 'scope'] },
  'realm-roles': { entity: true, defaultTab: 'details', tabs: ['details', 'associated-roles', 'attributes', 'users-in-role', 'permissions'] },
  groups: { entity: true, defaultTab: 'members', tabs: ['members', 'role-mappings', 'attributes', 'child-groups'] },
  organizations: { entity: true, defaultTab: 'details', tabs: ['details', 'domains', 'members', 'groups', 'identity-providers'] },
  'realm-settings': { entity: false, defaultTab: 'general', tabs: ['general', 'login', 'user-profile', 'email', 'themes', 'keys', 'events', 'localization', 'security-defenses', 'sessions', 'tokens'] },
  authentication: { entity: false, defaultTab: 'required-actions', tabs: ['flows', 'required-actions', 'policies'] },
  events: { entity: false, defaultTab: 'user-events', tabs: ['user-events', 'admin-events'] },
  'identity-providers': { entity: true, defaultTab: 'settings', tabs: ['settings', 'mappers'] },
  'user-federation': { entity: true, defaultTab: 'settings', tabs: ['settings', 'mappers'] },
} as const

export type IdentityAccessTabId = (typeof identityAccessSectionNavigationDefinitions)[keyof typeof identityAccessSectionNavigationDefinitions]['tabs'][number]

interface IdentityAccessSectionNavigation {
  entity: boolean
  defaultTab: IdentityAccessTabId
  tabs: readonly IdentityAccessTabId[]
}

export const identityAccessSectionNavigation: Partial<Record<IdentityAccessSectionId, IdentityAccessSectionNavigation>> = identityAccessSectionNavigationDefinitions

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

export function getVisibleIdentityAccessSections(groupId: IdentityAccessSectionGroupId): IdentityAccessSection[] {
  const group = getIdentityAccessGroup(groupId)
  return identityAccessVisibleSectionIds[groupId].flatMap(sectionId => (
    group.sections.filter(section => section.id === sectionId)
  ))
}

export function getIdentityAccessGroupForSection(sectionId: IdentityAccessSectionId): IdentityAccessSectionGroup {
  return identityAccessSectionGroups.find(group => group.sections.some(section => section.id === sectionId))
    ?? identityAccessSectionGroups[0]
}

export function getIdentityAccessDefaultSectionForGroup(groupId: IdentityAccessSectionGroupId): IdentityAccessSectionId {
  return getIdentityAccessGroup(groupId).defaultSectionId
}

export function sectionSupportsEntity(sectionId: IdentityAccessSectionId): boolean {
  return identityAccessSectionNavigation[sectionId]?.entity ?? false
}

export function parseIdentityAccessEntity(sectionId: IdentityAccessSectionId, value: string | null): string | null {
  const entityId = value?.trim()
  return sectionSupportsEntity(sectionId) && entityId ? entityId : null
}

export function parseIdentityAccessTab(
  sectionId: IdentityAccessSectionId,
  entityId: string | null,
  value: string | null,
): IdentityAccessTabId | null {
  const navigation = identityAccessSectionNavigation[sectionId]
  if (!navigation || (navigation.entity && !entityId)) return null

  if (value && navigation.tabs.includes(value as IdentityAccessTabId)) return value as IdentityAccessTabId
  return navigation.defaultTab
}
