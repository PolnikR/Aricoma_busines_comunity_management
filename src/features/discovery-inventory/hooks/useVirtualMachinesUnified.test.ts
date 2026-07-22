import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVirtualMachinesUnified } from './useVirtualMachinesUnified'
import * as vmApi from '../virtual-machines/api/useAllVirtualMachines'
import * as topologyApi from '../infrastructure/api/useInfrastructureTopology'

describe('useVirtualMachinesUnified', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return combined VM data and topology', () => {
    const mockVMs = [{ id: '1', name: 'VM1' }, { id: '2', name: 'VM2' }]
    const mockTopology = { nodes: [], edges: [] }

    vi.spyOn(vmApi, 'useAllVirtualMachines').mockReturnValue({
      data: mockVMs,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
    } as any)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: mockTopology,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
    } as any)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.vmList).toEqual(mockVMs)
    expect(result.current.topology).toEqual(mockTopology)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isFetching).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should return loading state when either query is loading', () => {
    vi.spyOn(vmApi, 'useAllVirtualMachines').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isFetching: true,
      status: 'pending',
      fetchStatus: 'fetching',
    } as any)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.isLoading).toBe(true)
  })

  it('should return error when either query fails', () => {
    const mockError = new Error('Failed to fetch VMs')

    vi.spyOn(vmApi, 'useAllVirtualMachines').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      isError: true,
      isFetching: false,
      status: 'error',
      fetchStatus: 'idle',
    } as any)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as any)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.error).toEqual(mockError)
  })
})
