import { useQuery } from '@tanstack/react-query'
import { fetchRolesPermissions } from '../api/identityAccessApi'
import { rolesPermissionsKeys } from '../api/rolesPermissionsQueryKeys'

export function useRolesPermissions() {
  return useQuery({
    queryKey: rolesPermissionsKeys.detail(),
    queryFn: fetchRolesPermissions,
  })
}
