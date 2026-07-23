import { useQuery } from '@tanstack/react-query'
import { fetchInfrastructureTopology } from '../helpers/infrastructureTopologyApi'

export const infrastructureTopologyQueryKey = [
  'discovery-inventory',
  'infrastructure-topology',
] as const

export function useInfrastructureTopology() {
  return useQuery({
    queryKey: infrastructureTopologyQueryKey,
    queryFn: fetchInfrastructureTopology,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
