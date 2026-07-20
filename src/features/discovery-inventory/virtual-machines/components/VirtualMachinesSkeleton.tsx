import { Card } from '@/shared/components/card/Card'

const metricSkeletons = [
  { valueWidth: 'w-16', labelWidth: 'w-24', helperWidth: 'w-28' },
  { valueWidth: 'w-12', labelWidth: 'w-20', helperWidth: 'w-24' },
  { valueWidth: 'w-10', labelWidth: 'w-16', helperWidth: 'w-24' },
  { valueWidth: 'w-24', labelWidth: 'w-28', helperWidth: 'w-24' },
]

const rowSkeletons = [
  { nameWidth: 'w-32', secondaryWidth: 'w-40' },
  { nameWidth: 'w-24', secondaryWidth: 'w-32' },
  { nameWidth: 'w-36', secondaryWidth: 'w-28' },
  { nameWidth: 'w-28', secondaryWidth: 'w-36' },
  { nameWidth: 'w-40', secondaryWidth: 'w-32' },
  { nameWidth: 'w-32', secondaryWidth: 'w-24' },
]

function SkeletonBlock({ className }: { className: string }) {
  return <span className={`block rounded-md bg-[#e8eff6] ${className}`} />
}

function MetricsSkeleton() {
  return (
    <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricSkeletons.map((metric, index) => (
        <div
          key={index}
          className="flex min-h-20 items-center gap-3 rounded-[18px] border border-[#dfeaf5] bg-white p-3.5"
        >
          <SkeletonBlock className="size-11 shrink-0 rounded-xl bg-[#e3f1fa]" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBlock className={`h-5 ${metric.valueWidth}`} />
            <SkeletonBlock className={`h-3.5 ${metric.labelWidth}`} />
            <SkeletonBlock className={`h-2.5 ${metric.helperWidth}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0"
      aria-hidden="true"
    >
      <div className="shrink-0 border-b border-[#e3edf6]">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <SkeletonBlock className="h-10 w-full rounded-xl lg:w-72" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-56 rounded-xl" />
            <SkeletonBlock className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid min-w-[760px] grid-cols-[minmax(190px,1.4fr)_120px_100px_120px] gap-5 border-b border-[#dfe9f3] bg-[#f6f9fc] px-4 py-3">
          {['w-24', 'w-12', 'w-16', 'w-16'].map((width, index) => (
            <SkeletonBlock key={index} className={`h-3 ${width}`} />
          ))}
        </div>
        <div className="min-w-[760px] divide-y divide-[#edf2f7]">
          {rowSkeletons.map((row, index) => (
            <div
              key={index}
              className="grid min-h-[73px] grid-cols-[minmax(190px,1.4fr)_120px_100px_120px] items-center gap-5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <SkeletonBlock className="size-8 shrink-0 rounded-xl" />
                <div className="space-y-2">
                  <SkeletonBlock className={`h-3.5 ${row.nameWidth}`} />
                  <SkeletonBlock className={`h-2.5 ${row.secondaryWidth}`} />
                </div>
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-20 rounded-full" />
                <SkeletonBlock className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-3.5 w-14" />
                <SkeletonBlock className="h-2.5 w-20" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="h-3.5 w-24" />
                <SkeletonBlock className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-4 border-t border-[#e3edf6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-3.5 w-32" />
          <SkeletonBlock className="h-9 w-20 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="size-9 rounded-lg" />
          <SkeletonBlock className="size-9 rounded-lg" />
          <SkeletonBlock className="size-9 rounded-lg" />
          <SkeletonBlock className="size-9 rounded-lg" />
        </div>
      </div>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <aside
      className="overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm xl:min-h-0"
      aria-hidden="true"
    >
      <div className="border-b border-[#dfe9f3] p-5">
        <SkeletonBlock className="h-2.5 w-32" />
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-3.5 w-52 max-w-full" />
          </div>
          <SkeletonBlock className="h-6 w-20 shrink-0 rounded-full" />
        </div>
        <div className="mt-4 flex gap-2">
          <SkeletonBlock className="h-6 w-20 rounded-full" />
          <SkeletonBlock className="h-6 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-[#dfe9f3]">
        {[0, 1].map((item) => (
          <div key={item} className="border-r border-[#dfe9f3] p-4 last:border-r-0">
            <SkeletonBlock className="size-5 rounded" />
            <SkeletonBlock className="mt-3 h-5 w-12" />
            <SkeletonBlock className="mt-2 h-2.5 w-16" />
          </div>
        ))}
      </div>

      <div className="px-5 py-2">
        {['w-32', 'w-24', 'w-36', 'w-28', 'w-12'].map((width, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 border-b border-[#edf2f7] py-4 last:border-b-0"
          >
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className={`h-3.5 ${width}`} />
          </div>
        ))}
      </div>
    </aside>
  )
}

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
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="mt-2 h-3 w-64 max-w-full" />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 bg-[#f5f8fc] p-3 lg:min-h-0 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
          <TableSkeleton />
          <DetailSkeleton />
        </div>
      </Card>
    </div>
  )
}
