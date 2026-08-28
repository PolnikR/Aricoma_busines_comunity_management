import { useTranslation } from '@/hooks/useTranslation'
import { defaultInfrastructureTopologyFilters } from '../model/filterInfrastructureTopology'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'
import type { FlashSystemVolumeTreeView } from '../model/flashSystemVolumeTreeTypes'
import { InfrastructureTopologyToolbar } from './InfrastructureTopologyToolbar'
import { InfrastructureTopologyLegend } from './InfrastructureTopologyLegend'

interface InfrastructureTopologySkeletonProps {
  platform?: InfrastructureTopologyPlatform
  flashSystemView?: FlashSystemVolumeTreeView
}

export function InfrastructureTopologySkeleton({ platform = 'vmware', flashSystemView }: InfrastructureTopologySkeletonProps) {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[20px] border border-border bg-surface"
      aria-busy="true"
      aria-label={t('topology.loading')}
    >
      <fieldset disabled>
        <InfrastructureTopologyToolbar
          platform={platform}
          filters={defaultInfrastructureTopologyFilters}
          options={{ hosts: [], systems: [], partitionStates: [] }}
          isLayouting={false}
          flashSystemView={flashSystemView}
          onFiltersChange={() => undefined}
          onFlashSystemViewChange={() => undefined}
          onAutoLayout={() => undefined}
          onResetPositions={() => undefined}
          onFitView={() => undefined}
        />
      </fieldset>
      <div className="flex-1 bg-surface-subtle p-6">
        <div className="h-full min-h-[430px] animate-pulse rounded-xl bg-surface-muted" />
      </div>
      <InfrastructureTopologyLegend platform={platform} visibleNodes={0} visibleEdges={0} isLoading />
    </div>
  )
}
