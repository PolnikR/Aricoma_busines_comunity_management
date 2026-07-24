import { useQuery } from '@tanstack/react-query'
import { fetchVdisksByVm } from '@/features/api/vdisksApi'

export function useVdisksByVm(vmName: string, providerId?: string) {
  return useQuery({
    queryKey: ['vdisks-by-vm', vmName, providerId ?? null],
    queryFn: () => fetchVdisksByVm(vmName, providerId),
    enabled: !!vmName,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
