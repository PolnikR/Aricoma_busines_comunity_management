import { useEffect, useRef, useState } from 'react'
import type { PositionedInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import { layoutInfrastructureTopology } from '../layout/layoutInfrastructureTopology'
import { applyTopologyNodePositionOverrides } from '../layout/applyNodePositionOverrides'
import type { InfrastructureTopology } from '../model/topologyTypes'

interface LayoutResult {
  source: InfrastructureTopology
  topology: PositionedInfrastructureTopology
}

interface LayoutError {
  source: InfrastructureTopology
  message: string
}

export function useTopologyLayout(topology: InfrastructureTopology) {
  const [layoutResult, setLayoutResult] = useState<LayoutResult | null>(null)
  const [layoutError, setLayoutError] = useState<LayoutError | null>(null)
  const [isManualLayouting, setIsManualLayouting] = useState(false)
  const layoutRequestId = useRef(0)
  const overridesRef = useRef<Record<string, { x: number; y: number }>>({})

  const doLayout = async (source: InfrastructureTopology, overrides: Record<string, { x: number; y: number }> = overridesRef.current) => {
    const requestId = layoutRequestId.current + 1
    layoutRequestId.current = requestId

    try {
      const nextTopology = await layoutInfrastructureTopology(source)
      if (layoutRequestId.current !== requestId) return

      setLayoutResult({
        source,
        topology: applyTopologyNodePositionOverrides(nextTopology, overrides),
      })
      setLayoutError(null)
    } catch (error: unknown) {
      if (layoutRequestId.current !== requestId) return

      const message = error instanceof Error ? error.message : 'Layout failed'
      setLayoutError({
        source,
        message,
      })
    }
  }

  // Auto-layout on topology change
  useEffect(() => {
    void doLayout(topology)
  }, [topology])

  const handleAutoLayout = async () => {
    setIsManualLayouting(true)
    overridesRef.current = {}
    await doLayout(topology, {})
    setIsManualLayouting(false)
  }

  return {
    layoutResult,
    layoutError,
    isLayouting: isManualLayouting || layoutResult?.source !== topology,
    handleAutoLayout,
    setOverride: (nodeId: string, position: { x: number; y: number }) => {
      overridesRef.current[nodeId] = position
    },
    clearOverrides: () => {
      overridesRef.current = {}
    },
  }
}
