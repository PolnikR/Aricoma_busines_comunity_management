import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { VirtualMachineFilters, VirtualMachinePageSize, VirtualMachinesQuery } from '../types'

const pageSizes: VirtualMachinePageSize[] = [10, 25, 50]

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parsePageSize(value: string | null): VirtualMachinePageSize {
  const parsed = Number(value)
  return pageSizes.includes(parsed as VirtualMachinePageSize) ? parsed as VirtualMachinePageSize : 10
}

function parseTags(value: string | null): string[] {
  if (!value) return []
  return value.split(',').filter(Boolean)
}


export function useVirtualMachineSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo<VirtualMachinesQuery>(() => ({
    page: parsePositiveInteger(searchParams.get('page'), 1),
    pageSize: parsePageSize(searchParams.get('pageSize')),
    search: searchParams.get('search') ?? '',
    powerState: searchParams.get('powerState') ?? '',
    connectionState: searchParams.get('connectionState') ?? '',
    cluster: searchParams.get('cluster') ?? '',
    tags: parseTags(searchParams.get('tags')),
  }), [searchParams])

  const updateQuery = (changes: Partial<VirtualMachinesQuery>, resetPage = false) => {
    const next = new URLSearchParams(searchParams)
    const values = resetPage ? { ...changes, page: 1 } : changes

    Object.entries(values).forEach(([key, value]) => {
      const normalized = Array.isArray(value) ? value.join(',') : String(value)
      if (!normalized || (key === 'page' && normalized === '1') || (key === 'pageSize' && normalized === '10')) next.delete(key)
      else next.set(key, normalized)
    })

    setSearchParams(next, { replace: true })
  }

  const updateFilters = (filters: VirtualMachineFilters) => { updateQuery(filters, true) }

  return { query, updateQuery, updateFilters }
}
