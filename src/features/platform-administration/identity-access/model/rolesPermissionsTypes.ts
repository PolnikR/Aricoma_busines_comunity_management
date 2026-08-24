import type { RolesPermissionsResponseOutput } from '@/generated/api/zod.gen'

export interface IdentityRoleRecord {
  id: string
  name: string
  permissions: string[]
}

export interface IdentityRolesPermissions {
  roles: IdentityRoleRecord[]
  permissions: string[]
}

export function mapRolesPermissions(payload: RolesPermissionsResponseOutput): IdentityRolesPermissions {
  return {
    roles: payload.roles.map(role => ({
      id: role.name,
      name: role.name,
      permissions: role.permissions,
    })),
    permissions: payload.permissions,
  }
}
