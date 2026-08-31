import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { DiscoveryCacheConfig } from '../model/discoveryCacheTypes'
import { useDiscoveryCacheConfigDraft } from './useDiscoveryCacheConfigDraft'

const initial: DiscoveryCacheConfig = {
  defaults: { VMWARE: 300, CUSTOM: 600 },
  historyRetention: { retentionDays: 30, maxRecords: 100 },
}

describe('useDiscoveryCacheConfigDraft', () => {
  it('seeds its draft from the incoming config', () => {
    const { result } = renderHook(() => useDiscoveryCacheConfigDraft(initial))

    expect(result.current.draft).toEqual({
      defaults: { VMWARE: '300', CUSTOM: '600' },
      historyRetention: { retentionDays: '30', maxRecords: '100' },
    })
    expect(result.current.isDirty).toBe(false)
  })

  it('keeps unsaved edits when incoming query data changes', () => {
    const { result, rerender } = renderHook(({ config }) => useDiscoveryCacheConfigDraft(config), { initialProps: { config: initial } })
    act(() => { result.current.setDefault('VMWARE', '') })
    const refreshed = { ...initial, defaults: { ...initial.defaults, VMWARE: 120 } }
    rerender({ config: refreshed })

    expect(result.current.draft?.defaults['VMWARE']).toBe('')
    expect(result.current.isDirty).toBe(true)
  })

  it('cancels to the latest server baseline', () => {
    const { result, rerender } = renderHook(({ config }) => useDiscoveryCacheConfigDraft(config), { initialProps: { config: initial } })
    act(() => { result.current.setDefault('VMWARE', '60') })
    const refreshed = { ...initial, defaults: { ...initial.defaults, VMWARE: 120 } }
    rerender({ config: refreshed })
    act(() => { result.current.cancel() })

    expect(result.current.draft?.defaults['VMWARE']).toBe('120')
    expect(result.current.isDirty).toBe(false)
  })

  it('adopts a successful mutation result as its clean baseline', () => {
    const { result } = renderHook(() => useDiscoveryCacheConfigDraft(initial))
    const saved = { ...initial, defaults: { ...initial.defaults, VMWARE: 60 } }
    act(() => { result.current.setDefault('VMWARE', '60') })
    act(() => { result.current.adopt(saved) })

    expect(result.current.draft?.defaults['VMWARE']).toBe('60')
    expect(result.current.isDirty).toBe(false)
  })
})
