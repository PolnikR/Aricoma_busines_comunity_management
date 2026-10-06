import { describe, expect, it } from 'vitest'
import { formatMetroMirrorState, metroMirrorStateTone, presentMetroMirrorMapping } from './metroMirrorPresentation'

const group = { id: '55', name: 'rdb_and_app', state: 'inconsistent_copying', primary: 'master', relationship_count: 4, progress: 64 }

describe('metroMirrorStateTone', () => {
  it.each([
    ['consistent_synchronized', 'success'],
    ['inconsistent_copying', 'info'],
    ['consistent_stopped', 'warning'],
    ['idling', 'warning'],
    ['idling_disconnected', 'error'],
    ['CONSISTENT_DISCONNECTED', 'error'],
    ['some_future_state', 'neutral'],
    [null, 'neutral'],
  ] as const)('maps %s to %s', (state, tone) => {
    expect(metroMirrorStateTone(state)).toBe(tone)
  })

  it('formats the reported state for display', () => {
    expect(formatMetroMirrorState('inconsistent_copying')).toBe('Inconsistent copying')
  })
})

describe('presentMetroMirrorMapping', () => {
  it('shows only the progress when the mapping state matches the group', () => {
    const presentation = presentMetroMirrorMapping({ state: 'inconsistent_copying', progress: 72, primary: 'master' }, group)

    expect(presentation.value).toEqual({ kind: 'percent', progress: 72 })
    expect(presentation.localState).toBeNull()
    expect(presentation.primaryException).toBeNull()
    expect(presentation.direction).toBe('forward')
    expect(presentation.dashed).toBe(false)
  })

  it('keeps a real 0 % and never turns null progress into 0', () => {
    expect(presentMetroMirrorMapping({ state: 'inconsistent_copying', progress: 0 }, group).value).toEqual({ kind: 'percent', progress: 0 })
    expect(presentMetroMirrorMapping({ state: 'inconsistent_copying', progress: null }, group).value).toEqual({ kind: 'notReported' })
    expect(presentMetroMirrorMapping({ state: 'consistent_synchronized', progress: null }, group).value).toEqual({ kind: 'inSync' })
  })

  it('prints a state that differs from the group, an unknown state and a missing state', () => {
    expect(presentMetroMirrorMapping({ state: 'consistent_stopped' }, group).localState).toEqual({ state: 'consistent_stopped' })
    expect(presentMetroMirrorMapping({ state: 'some_future_state' }, { ...group, state: 'some_future_state' }).localState).toEqual({ state: 'some_future_state' })
    expect(presentMetroMirrorMapping({}, group).localState).toEqual({ state: null })
  })

  it('reports a primary exception and reverses the direction when the auxiliary is primary', () => {
    const presentation = presentMetroMirrorMapping({ state: 'inconsistent_copying', primary: 'aux' }, group)

    expect(presentation.primaryException).toBe('aux')
    expect(presentation.direction).toBe('backward')
  })

  it('dashes unreported progress and problem states, not synchronized ones', () => {
    expect(presentMetroMirrorMapping({ state: 'consistent_stopped', progress: null }, group).dashed).toBe(true)
    expect(presentMetroMirrorMapping({ state: 'idling_disconnected', progress: 10 }, group).dashed).toBe(true)
    expect(presentMetroMirrorMapping({ state: 'consistent_synchronized', progress: null }, group).dashed).toBe(false)
  })
})
