import { SkeletonBlock } from './SkeletonBlock'

export function DetailSkeleton() {
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
