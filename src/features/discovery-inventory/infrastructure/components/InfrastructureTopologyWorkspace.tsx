import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/shared/components/card/Card'
import {
  defaultInfrastructureTopologyFilters,
  filterInfrastructureTopology,
  getInfrastructureTopologyFilterOptions,
} from '../model/filterInfrastructureTopology'
import type { InfrastructureTopologyFilters } from '../model/filterInfrastructureTopology'
import type { InfrastructureTopology, InfrastructureTopologyPlatform } from '../model/topologyTypes'
import type { FlashSystemVolumeTreeView } from '../../model/discoveryTypes'
import { useTopologyNodePositionOverrides } from '../hooks/useTopologyNodePositionOverrides'
import { useTopologyLayout } from '../hooks/useTopologyLayout'
import { InfrastructureTopologyCanvas } from './InfrastructureTopologyCanvas'
import { InfrastructureTopologyLegend } from './InfrastructureTopologyLegend'
import { InfrastructureTopologyToolbar } from './InfrastructureTopologyToolbar'
import { useTranslation } from '@/hooks/useTranslation'

interface InfrastructureTopologyWorkspaceProps {
  topology: InfrastructureTopology
  platform: InfrastructureTopologyPlatform
  positionScope?: string
  flashSystemView?: FlashSystemVolumeTreeView | undefined
  onFlashSystemViewChange?: (view: FlashSystemVolumeTreeView) => void
}

export function InfrastructureTopologyWorkspace({
  topology,
  platform,
  positionScope,
  flashSystemView,
  onFlashSystemViewChange,
}: InfrastructureTopologyWorkspaceProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState(defaultInfrastructureTopologyFilters)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [fitViewRequest, setFitViewRequest] = useState(0)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { overrides, setOverride, clearOverrides } = useTopologyNodePositionOverrides(positionScope)
  const overridesRef = useRef(overrides)

  useEffect(() => {
    overridesRef.current = overrides
  }, [overrides])

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 250)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [filters.search])
  const filterOptions = useMemo(
    () => getInfrastructureTopologyFilterOptions(topology),
    [topology],
  )
  const effectiveFilters = useMemo<InfrastructureTopologyFilters>(() => ({
    search: debouncedSearch,
    powerState: filters.powerState,
    host: filters.host,
    showDatastores: filters.showDatastores,
    system: filters.system,
    partitionKind: filters.partitionKind,
    partitionState: filters.partitionState,
  }), [
    debouncedSearch,
    filters.powerState,
    filters.host,
    filters.showDatastores,
    filters.system,
    filters.partitionKind,
    filters.partitionState,
  ])
  const filteredTopology = useMemo(
    () => filterInfrastructureTopology(topology, effectiveFilters),
    [effectiveFilters, topology],
  )

  const { layoutResult, layoutError, isLayouting, handleAutoLayout, clearOverrides: clearLayoutOverrides } = useTopologyLayout(
    filteredTopology,
  )

  const positionedTopology = layoutResult?.topology ?? null
  const visibleLayoutError = layoutError?.source === filteredTopology
    ? layoutError.message
    : null

  const handleAutoLayoutClick = () => {
    overridesRef.current = {}
    clearOverrides()
    void handleAutoLayout()
  }

  const handleResetPositions = () => {
    overridesRef.current = {}
    clearOverrides()
    clearLayoutOverrides()
    setFitViewRequest((value) => value + 1)
  }

  return (
    <Card className="relative flex h-dvh min-h-0 w-full min-w-0 max-w-full flex-none flex-col overflow-hidden p-0 sm:p-0 lg:h-auto lg:flex-1 lg:min-h-0">
      <InfrastructureTopologyToolbar
        platform={platform}
        filters={filters}
        options={filterOptions}
        isLayouting={isLayouting}
        flashSystemView={flashSystemView}
        onFiltersChange={setFilters}
        onFlashSystemViewChange={onFlashSystemViewChange}
        onAutoLayout={handleAutoLayoutClick}
        onResetPositions={handleResetPositions}
        onFitView={() => { setFitViewRequest((value) => value + 1) }}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden bg-surface-subtle">
        {positionedTopology ? (
          <InfrastructureTopologyCanvas
            topology={positionedTopology}
            fitViewRequest={fitViewRequest}
            onNodePositionChange={setOverride}
          />
        ) : null}

        {isLayouting ? (
          <div
            className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs font-medium text-text-secondary shadow-sm"
            role="status"
          >
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            {t('topology.arranging')}
          </div>
        ) : null}

        {visibleLayoutError ? (
          <div className="absolute inset-x-4 top-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-300" role="alert">
            {visibleLayoutError}
          </div>
        ) : null}

        {!isLayouting && positionedTopology?.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <h3 className="text-sm font-semibold text-text-secondary">{t('topology.noMatches')}</h3>
              <p className="mt-1 text-sm text-text-muted">{t('topology.adjustFilters')}</p>
            </div>
          </div>
        ) : null}
      </div>

      <InfrastructureTopologyLegend
        platform={platform}
        visibleNodes={filteredTopology.nodes.length}
        visibleEdges={filteredTopology.edges.length}
      />
    </Card>
  )
}
