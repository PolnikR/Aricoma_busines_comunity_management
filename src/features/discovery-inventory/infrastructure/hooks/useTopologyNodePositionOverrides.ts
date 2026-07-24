import { useCallback, useState } from 'react'
import { z } from 'zod'

const STORAGE_KEY = 'abcm-fe.infrastructure-topology.node-positions.v1'

export interface TopologyNodePosition {
  x: number
  y: number
}

export type TopologyNodePositionOverrides = Record<string, TopologyNodePosition>

const overridesSchema = z.record(
  z.string(),
  z.object({ x: z.number(), y: z.number() }),
)

function readStoredOverrides(): TopologyNodePositionOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as unknown
    const result = overridesSchema.safeParse(parsed)

    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

function writeStoredOverrides(overrides: TopologyNodePositionOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Silently fail (e.g., Safari private mode) — don't break the diagram
  }
}

export function useTopologyNodePositionOverrides() {
  const [overrides, setOverrides] = useState<TopologyNodePositionOverrides>(() =>
    readStoredOverrides(),
  )

  const setOverride = useCallback(
    (nodeId: string, position: TopologyNodePosition) => {
      setOverrides((prev) => {
        const newOverrides = { ...prev, [nodeId]: position }
        writeStoredOverrides(newOverrides)
        return newOverrides
      })
    },
    [],
  )

  const clearOverrides = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Silently fail
    }
    setOverrides({})
  }, [])

  return {
    overrides,
    setOverride,
    clearOverrides,
    hasOverrides: Object.keys(overrides).length > 0,
  }
}
