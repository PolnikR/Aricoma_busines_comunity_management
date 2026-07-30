import { SkeletonBlock } from './SkeletonBlock'

const metricSkeletons = [
  { valueWidth: 'w-16', labelWidth: 'w-24', helperWidth: 'w-28' },
  { valueWidth: 'w-12', labelWidth: 'w-20', helperWidth: 'w-24' },
  { valueWidth: 'w-10', labelWidth: 'w-16', helperWidth: 'w-24' },
  { valueWidth: 'w-24', labelWidth: 'w-28', helperWidth: 'w-24' },
]

export function MetricsSkeleton() {
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
