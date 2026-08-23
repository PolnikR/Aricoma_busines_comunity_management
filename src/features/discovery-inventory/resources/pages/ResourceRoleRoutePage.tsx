import { Navigate, useParams } from 'react-router'
import { routes } from '@/app/routes'
import { ResourceRolePage } from './ResourceRolePage'
import type { ProviderRole } from '@/features/providers-connectors/providers/model/providerTypes'

function isProviderRole(value: string | undefined): value is ProviderRole {
  return value === 'source' || value === 'target'
}

export function ResourceRoleRoutePage() {
  const { role } = useParams<{ role: string }>()

  return isProviderRole(role)
    ? <ResourceRolePage role={role} />
    : <Navigate to={routes.resources} replace />
}
