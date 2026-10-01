import type { RolesPermissionsResponse } from '@/generated/query/zod'

export interface IdentityRoleRecord {
  id: string
  name: string
  permissions: string[]
  description?: string
  users: string[]
  userCount: number
  // null when the backend's best-effort Keycloak membership lookup failed; users/userCount are then unknown.
  clientId: string | null
}

export interface IdentityRolesPermissions {
  roles: IdentityRoleRecord[]
  permissions: string[]
}

// Roles have no id on the wire; the UI keys them by name.
export function mapRolesPermissions(payload: RolesPermissionsResponse): IdentityRolesPermissions {
  return {
    permissions: payload.permissions,
    roles: payload.roles.map(role => ({
      id: role.name,
      name: role.name,
      permissions: role.permissions,
      description: role.description ?? '',
      users: role.users ?? [],
      userCount: role.userCount ?? 0,
      clientId: role.clientId ?? null,
    })),
  }
}

// The generated hook declares the schema Input shape for select; validatingMutator
// hands it the parsed Output, which only adds defaulted fields this mapper ignores.
export const selectRolesPermissions = mapRolesPermissions
