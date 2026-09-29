import type { RolesPermissionsResponseOutput } from '@/generated/query/zod'

export interface IdentityRoleRecord {
  id: string
  name: string
  permissions: string[]
  description?: string
}

export interface IdentityRolesPermissions {
  roles: IdentityRoleRecord[]
  permissions: string[]
}

// Roles have no id on the wire; the UI keys them by name.
export function mapRolesPermissions(payload: RolesPermissionsResponseOutput): IdentityRolesPermissions {
  return {
    ...payload,
    roles: payload.roles.map(role => ({
      ...role,
      id: role.name,
      description: role.description ?? '',
    })),
  }
}

// validatingMutator hands select the parsed Output shape; for this schema it is
// identical to the Input shape the generated hook declares.
export const selectRolesPermissions = mapRolesPermissions
