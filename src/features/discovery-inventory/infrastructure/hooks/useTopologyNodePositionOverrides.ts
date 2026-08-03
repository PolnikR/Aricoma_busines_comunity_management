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

function readStoredOverrides(storageKey: string): TopologyNodePositionOverrides {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return {}

    const parsed = JSON.parse(stored) as unknown
    const result = overridesSchema.safeParse(parsed)

    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

function writeStoredOverrides(
  storageKey: string,
  overrides: TopologyNodePositionOverrides,
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(overrides))
  } catch {
    // Silently fail (e.g., Safari private mode) — don't break the diagram
  }
}

export function useTopologyNodePositionOverrides(scope?: string) {
  const storageKey = scope ? `${STORAGE_KEY}.${encodeURIComponent(scope)}` : STORAGE_KEY
  const [overrides, setOverrides] = useState<TopologyNodePositionOverrides>(() =>
    readStoredOverrides(storageKey),
  )

  const setOverride = useCallback(
    (nodeId: string, position: TopologyNodePosition) => {
      setOverrides((prev) => {
        const newOverrides = { ...prev, [nodeId]: position }
        writeStoredOverrides(storageKey, newOverrides)
        return newOverrides
      })
    },
    [storageKey],
  )

  const clearOverrides = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Silently fail
    }
    setOverrides({})
  }, [storageKey])

  return {
    overrides,
    setOverride,
    clearOverrides,
    hasOverrides: Object.keys(overrides).length > 0,
  }
}
