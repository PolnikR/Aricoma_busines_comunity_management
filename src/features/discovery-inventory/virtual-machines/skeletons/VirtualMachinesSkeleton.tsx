import { Card } from '@/shared/components/card/Card'
import { DetailSkeleton } from './DetailSkeleton'
import { MetricsSkeleton } from './MetricsSkeleton'
import { TableSkeleton } from './TableSkeleton'

export function VirtualMachinesSkeleton() {
  return (
    <div
      className="flex flex-1 flex-col gap-4 lg:min-h-0"
      role="status"
      aria-busy="true"
      aria-label="Loading virtual machines"
    >
      <MetricsSkeleton />

      <Card className="relative flex flex-1 flex-col overflow-hidden p-0 sm:p-0 lg:min-h-0">
        <div className="shrink-0 border-b border-[#dbe7f2] bg-white px-4 py-3" aria-hidden="true">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded-lg bg-linear-to-r from-[#e3edf6] to-[#f0f5fa] animate-pulse" />
              <div className="h-3 w-64 rounded-lg bg-linear-to-r from-[#dbe7f2] to-[#e8eff6] animate-pulse" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-20 rounded-md bg-[#eef4f9] animate-pulse" />
              <div className="h-9 w-16 rounded-md bg-[#eef4f9] animate-pulse" />
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 bg-[#f8fbfe] p-3 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
          <TableSkeleton />
          <DetailSkeleton />
        </div>
      </Card>
    </div>
  )
}
