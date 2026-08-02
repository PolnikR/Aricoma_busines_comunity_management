import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useResourceTabSearchParam } from './useResourceTabSearchParam'

describe('useResourceTabSearchParam', () => {
  it('reads, updates, and clears the selected resource tab in the URL', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={['/?resource=flashsystem&search=db']}>{children}</MemoryRouter>
    )
    const { result } = renderHook(() => useResourceTabSearchParam(), { wrapper })
    expect(result.current.resourceTab).toBe('flashsystem')

    act(() => { result.current.setResourceTab('ibm-power') })
    expect(result.current.resourceTab).toBe('ibm-power')

    act(() => { result.current.setResourceTab('vmware') })
    expect(result.current.resourceTab).toBe('vmware')
  })
})
