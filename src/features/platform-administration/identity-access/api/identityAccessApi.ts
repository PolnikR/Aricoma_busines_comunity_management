import { getRolesPermissionsGetRolesPermissionsGet } from '@/generated/api/client.gen'
import { RolesPermissionsResponse } from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import { mapRolesPermissions, type IdentityRolesPermissions } from '../model/rolesPermissionsTypes'

export async function fetchRolesPermissions(): Promise<IdentityRolesPermissions> {
  try {
    const payload = await getRolesPermissionsGetRolesPermissionsGet()
    const parsed = parseGeneratedResponse(RolesPermissionsResponse, payload, 'GET /get_roles_permissions')
    return mapRolesPermissions(parsed)
  } catch (error) {
    throw toOrvalRequestError(error, 'Get roles permissions')
  }
}
