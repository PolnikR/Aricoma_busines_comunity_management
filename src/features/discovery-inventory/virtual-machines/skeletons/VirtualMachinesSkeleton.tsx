import { Card } from '@/shared/components/card/Card'
import { DetailSkeleton } from './DetailSkeleton'
import { MetricsSkeleton } from './MetricsSkeleton'
import { TableSkeleton } from './TableSkeleton'

export function VirtualMachinesSkeleton() {
  return (
    <div
      className="flex flex-1 animate-pulse flex-col gap-4 lg:min-h-0"
      role="status"
      aria-busy="true"
      aria-label="Loading virtual machines"
    >
      <MetricsSkeleton />

      <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
        <div className="shrink-0 border-b border-[#e3edf6] px-4 py-4" aria-hidden="true">
          <span className="block rounded-md bg-[#e8eff6] h-4 w-36" />
          <span className="block rounded-md bg-[#e8eff6] mt-2 h-3 w-64 max-w-full" />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 bg-[#f5f8fc] p-3 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
          <TableSkeleton />
          <DetailSkeleton />
        </div>
      </Card>
    </div>
  )
}
