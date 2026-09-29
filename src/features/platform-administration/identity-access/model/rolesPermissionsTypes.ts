import type { RolesPermissionsResponse, RolesPermissionsResponseOutput } from '@/generated/query/zod'

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

// validatingMutator parses the response through the zod schema before handing it to
// react-query, so select receives the Output shape even though the generated hook
// declares the Input shape. The cast keeps the accurate Output types.
export const selectRolesPermissions = mapRolesPermissions as (response: RolesPermissionsResponse) => IdentityRolesPermissions
