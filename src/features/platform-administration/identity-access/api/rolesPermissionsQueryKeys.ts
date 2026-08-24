export const rolesPermissionsKeys = {
  all: ['identity-access', 'roles-permissions'] as const,
  detail: () => [...rolesPermissionsKeys.all, 'current-user'] as const,
}
