import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/shared/components/card/Card'
import { applyTopologyNodePositionOverrides } from '../layout/applyNodePositionOverrides'
import { layoutInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import {
  defaultInfrastructureTopologyFilters,
  filterInfrastructureTopology,
  getInfrastructureTopologyFilterOptions,
} from '../model/filterInfrastructureTopology'
import type { InfrastructureTopologyFilters } from '../model/filterInfrastructureTopology'
import type { InfrastructureTopology } from '../model/topologyTypes'
import { useTopologyNodePositionOverrides } from '../hooks/useTopologyNodePositionOverrides'
import { InfrastructureTopologyCanvas } from './InfrastructureTopologyCanvas'
import { InfrastructureTopologyLegend } from './InfrastructureTopologyLegend'
import { InfrastructureTopologyToolbar } from './InfrastructureTopologyToolbar'

interface InfrastructureTopologyWorkspaceProps {
  topology: InfrastructureTopology
}

interface LayoutResult {
  source: InfrastructureTopology
  topology: PositionedInfrastructureTopology
}

interface LayoutError {
  source: InfrastructureTopology
  message: string
}

export function InfrastructureTopologyWorkspace({
  topology,
}: InfrastructureTopologyWorkspaceProps) {
  const [filters, setFilters] = useState(defaultInfrastructureTopologyFilters)
  const deferredSearch = useDeferredValue(filters.search)
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null)
  const [layoutError, setLayoutError] = useState<LayoutError | null>(null)
  const [isManualLayouting, setIsManualLayouting] = useState(false)
  const [fitViewRequest, setFitViewRequest] = useState(0)
  const layoutRequestId = useRef(0)
  const { overrides, setOverride, clearOverrides } = useTopologyNodePositionOverrides()
  const overridesRef = useRef(overrides)

  useEffect(() => {
    overridesRef.current = overrides
  }, [overrides])
  const filterOptions = useMemo(
    () => getInfrastructureTopologyFilterOptions(topology),
    [topology],
  )
  const effectiveFilters = useMemo<InfrastructureTopologyFilters>(() => ({
    ...filters,
    search: deferredSearch,
  }), [deferredSearch, filters])
  const filteredTopology = useMemo(
    () => filterInfrastructureTopology(topology, effectiveFilters),
    [effectiveFilters, topology],
  )
  const positionedTopology = layoutResult?.topology ?? null
  const isLayouting = isManualLayouting || layoutResult?.source !== filteredTopology
  const visibleLayoutError = layoutError?.source === filteredTopology
    ? layoutError.message
    : null

  useEffect(() => {
    const requestId = layoutRequestId.current + 1
    layoutRequestId.current = requestId

    void layoutInfrastructureTopology(filteredTopology).then(
      (nextTopology) => {
        if (layoutRequestId.current !== requestId) return

        setLayoutResult({
          source: filteredTopology,
          topology: applyTopologyNodePositionOverrides(nextTopology, overridesRef.current),
        })
        setLayoutError(null)
      },
      (error: unknown) => {
        if (layoutRequestId.current !== requestId) return

        setLayoutError({
          source: filteredTopology,
          message: error instanceof Error ? error.message : 'Topology layout failed.',
        })
      },
    )
  }, [filteredTopology])

  const handleAutoLayout = () => {
    const requestId = layoutRequestId.current + 1
    layoutRequestId.current = requestId
    overridesRef.current = {}
    clearOverrides()
    setIsManualLayouting(true)
    void layoutInfrastructureTopology(filteredTopology)
      .then(
        (nextTopology) => {
          if (layoutRequestId.current !== requestId) return

          setLayoutResult({
            source: filteredTopology,
            topology: applyTopologyNodePositionOverrides(nextTopology, overridesRef.current),
          })
          setLayoutError(null)
        },
        (error: unknown) => {
          if (layoutRequestId.current !== requestId) return

          setLayoutError({
            source: filteredTopology,
            message: error instanceof Error ? error.message : 'Topology layout failed.',
          })
        },
      )
      .finally(() => {
        setIsManualLayouting(false)
      })
  }

  const handleResetPositions = () => {
    overridesRef.current = {}
    clearOverrides()
    if (layoutResult?.source === filteredTopology && layoutResult?.topology) {
      setLayoutResult({
        source: filteredTopology,
        topology: applyTopologyNodePositionOverrides(layoutResult.topology, {}),
      })
      setFitViewRequest((value) => value + 1)
    }
  }

  return (
    <Card className="relative flex h-dvh min-h-0 w-full min-w-0 max-w-full flex-none flex-col overflow-hidden p-0 sm:p-0 lg:h-auto lg:flex-1 lg:min-h-0">
      <InfrastructureTopologyToolbar
        filters={filters}
        options={filterOptions}
        isLayouting={isLayouting}
        onFiltersChange={setFilters}
        onAutoLayout={handleAutoLayout}
        onResetPositions={handleResetPositions}
        onFitView={() => { setFitViewRequest((value) => value + 1) }}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f8fbfe]">
        {positionedTopology ? (
          <InfrastructureTopologyCanvas
            topology={positionedTopology}
            fitViewRequest={fitViewRequest}
            onNodePositionChange={setOverride}
          />
        ) : null}

        {isLayouting ? (
          <div
            className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg border border-[#d8e5f0] bg-white/95 px-3 py-2 text-xs font-medium text-[#5b6c84] shadow-sm"
            role="status"
          >
            <span className="size-2 animate-pulse rounded-full bg-[#0d91d7]" />
            Arranging topology
          </div>
        ) : null}

        {visibleLayoutError ? (
          <div className="absolute inset-x-4 top-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
            {visibleLayoutError}
          </div>
        ) : null}

        {!isLayouting && positionedTopology?.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div>
              <h3 className="text-sm font-semibold text-[#263750]">No matching infrastructure</h3>
              <p className="mt-1 text-sm text-[#71819a]">Adjust search or topology filters.</p>
            </div>
          </div>
        ) : null}
      </div>

      <InfrastructureTopologyLegend
        visibleNodes={filteredTopology.nodes.length}
        visibleEdges={filteredTopology.edges.length}
      />
    </Card>
  )
}
