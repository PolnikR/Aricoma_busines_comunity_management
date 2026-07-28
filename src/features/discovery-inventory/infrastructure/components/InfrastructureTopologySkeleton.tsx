import { useTranslation } from '@/hooks/useTranslation'

export function InfrastructureTopologySkeleton() {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-[620px] flex-1 animate-pulse flex-col overflow-hidden rounded-[20px] border border-[#dfeaf5] bg-white"
      aria-busy="true"
      aria-label={t('topology.loading')}
    >
      <div className="flex flex-wrap gap-3 border-b border-[#e3edf6] p-4">
        <div className="h-10 w-full rounded-xl bg-[#edf3f8] sm:w-80" />
        <div className="h-10 w-52 rounded-xl bg-[#edf3f8]" />
        <div className="ml-auto h-10 w-64 rounded-xl bg-[#edf3f8]" />
      </div>
      <div className="flex-1 bg-[#f8fbfe] p-6">
        <div className="h-full min-h-[430px] rounded-xl bg-[#edf3f8]" />
      </div>
      <div className="h-10 border-t border-[#e3edf6] bg-white" />
    </div>
  )
}
