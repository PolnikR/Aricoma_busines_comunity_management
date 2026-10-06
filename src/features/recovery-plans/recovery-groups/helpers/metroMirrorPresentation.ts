import type { RecoveryGroupInventoryResponseOutput } from '@/generated/query/zod'

export type MetroMirrorStatusOutput = NonNullable<RecoveryGroupInventoryResponseOutput['metro_mirror']>
export type MetroMirrorGroupOutput = NonNullable<MetroMirrorStatusOutput['consistency_group']>
export type MetroMirrorMappingOutput = MetroMirrorStatusOutput['mappings'][number]
export type InventoryVolumeOutput = RecoveryGroupInventoryResponseOutput['volumes'][string]

export type MetroMirrorTone = 'success' | 'info' | 'warning' | 'error' | 'neutral'

// IBM Spectrum Virtualize / FlashSystem states of a remote-copy relationship and its
// consistency group (lsrcrelationship / lsrcconsistgrp). The API passes them through
// as plain strings, so anything not listed (a newer firmware state) stays neutral.
const STATE_TONES: Record<string, MetroMirrorTone> = {
  consistent_synchronized: 'success',
  inconsistent_copying: 'info',
  consistent_copying: 'info',
  inconsistent_stopped: 'warning',
  consistent_stopped: 'warning',
  idling: 'warning',
  idling_disconnected: 'error',
  inconsistent_disconnected: 'error',
  consistent_disconnected: 'error',
  empty: 'neutral',
}

export function metroMirrorStateTone(state: string | null | undefined): MetroMirrorTone {
  if (!state) return 'neutral'
  return STATE_TONES[state.toLowerCase()] ?? 'neutral'
}

// "inconsistent_copying" → "Inconsistent copying"; IBM terms are shown as reported.
export function formatMetroMirrorState(state: string): string {
  const text = state.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "master" / "aux" in the user's language; anything else as reported.
export function metroMirrorSideLabel(side: string, t: (key: string) => string) {
  if (side === 'master' || side === 'aux') return t(`recoveryInventory.metroMirror.side.${side}`)
  return formatMetroMirrorState(side)
}

// What the mapping's connector shows next to its label. `null` progress is never 0 %.
export type MetroMirrorValue =
  | { kind: 'percent'; progress: number }
  | { kind: 'inSync' }
  | { kind: 'notReported' }

export interface MetroMirrorMappingPresentation {
  tone: MetroMirrorTone
  value: MetroMirrorValue
  // Set only when the mapping state is worth printing on its row: it differs from the
  // group, or it is missing (state null) or not a known state.
  localState: { state: string | null } | null
  // The mapping primary, only when it differs from the group's primary.
  primaryException: string | null
  // Replication runs from the primary: auxiliary → master when the auxiliary is primary.
  direction: 'forward' | 'backward'
  dashed: boolean
}

export function presentMetroMirrorMapping(
  mapping: MetroMirrorMappingOutput,
  group: MetroMirrorGroupOutput | null | undefined,
): MetroMirrorMappingPresentation {
  const state = mapping.state ?? null
  const tone = metroMirrorStateTone(state)
  const progress = typeof mapping.progress === 'number' ? mapping.progress : null
  const value: MetroMirrorValue = progress !== null
    ? { kind: 'percent', progress }
    : tone === 'success' ? { kind: 'inSync' } : { kind: 'notReported' }
  const groupState = group?.state ?? null
  const groupPrimary = group?.primary ?? 'master'
  const primary = mapping.primary ?? null
  return {
    tone,
    value,
    localState: state === null || state !== groupState || !(state.toLowerCase() in STATE_TONES) ? { state } : null,
    primaryException: primary !== null && primary !== groupPrimary ? primary : null,
    direction: primary === 'aux' ? 'backward' : 'forward',
    dashed: value.kind === 'notReported' || tone === 'error',
  }
}
