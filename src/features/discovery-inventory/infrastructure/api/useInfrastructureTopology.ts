import { useQuery } from '@tanstack/react-query'
import { fetchInfrastructureTopology } from './infrastructureTopologyApi'

export const infrastructureTopologyQueryKey = [
  'discovery-inventory',
  'infrastructure-topology',
] as const

export function useInfrastructureTopology() {
  return useQuery({
    queryKey: infrastructureTopologyQueryKey,
    queryFn: fetchInfrastructureTopology,
  })
}
