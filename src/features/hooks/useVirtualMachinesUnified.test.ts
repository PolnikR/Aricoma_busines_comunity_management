import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useVirtualMachinesUnified } from './useVirtualMachinesUnified'
import * as vmApi from '@/features/discovery-inventory/virtual-machines/api/useAllVirtualMachines'
import * as topologyApi from '@/features/discovery-inventory/infrastructure/api/useInfrastructureTopology'
import type { AllVirtualMachinesData } from '@/features/discovery-inventory/virtual-machines/helpers/virtualMachinesApi'
import type { InfrastructureTopology } from '@/features/discovery-inventory/infrastructure/model/topologyTypes'

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
    } as unknown as UseQueryResult<AllVirtualMachinesData>)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: mockTopology,
      isLoading: false,
      isFetching: false,
      error: null,
      isError: false,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
    } as unknown as UseQueryResult<InfrastructureTopology>)

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
    } as unknown as UseQueryResult<AllVirtualMachinesData>)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult<InfrastructureTopology>)

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
    } as unknown as UseQueryResult<AllVirtualMachinesData>)

    vi.spyOn(topologyApi, 'useInfrastructureTopology').mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isFetching: false,
      status: 'success',
      fetchStatus: 'idle',
    } as unknown as UseQueryResult<InfrastructureTopology>)

    const { result } = renderHook(() => useVirtualMachinesUnified())

    expect(result.current.error).toEqual(mockError)
  })
})
