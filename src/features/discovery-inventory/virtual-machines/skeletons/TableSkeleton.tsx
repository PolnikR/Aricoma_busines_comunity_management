import { SkeletonBlock } from './SkeletonBlock'

const rowSkeletons = [
  { nameWidth: 'w-32', secondaryWidth: 'w-40' },
  { nameWidth: 'w-24', secondaryWidth: 'w-32' },
  { nameWidth: 'w-36', secondaryWidth: 'w-28' },
  { nameWidth: 'w-28', secondaryWidth: 'w-36' },
  { nameWidth: 'w-40', secondaryWidth: 'w-32' },
  { nameWidth: 'w-32', secondaryWidth: 'w-24' },
]

export function TableSkeleton() {
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
        <div className="grid min-w-190 grid-cols-[minmax(190px,1.4fr)_120px_100px_120px] gap-5 border-b border-[#dfe9f3] bg-[#f6f9fc] px-4 py-3">
          {['w-24', 'w-12', 'w-16', 'w-16'].map((width, index) => (
            <SkeletonBlock key={index} className={`h-3 ${width}`} />
          ))}
        </div>
        <div className="min-w-190 divide-y divide-[#edf2f7]">
          {rowSkeletons.map((row, index) => (
            <div
              key={index}
              className="grid min-h-18.25 grid-cols-[minmax(190px,1.4fr)_120px_100px_120px] items-center gap-5 px-4 py-3"
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
