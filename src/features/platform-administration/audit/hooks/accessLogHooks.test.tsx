import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import type { AccessLogFilters } from '../model/accessLogTypes'
import { fetchAccessLogs } from '../api/accessLogsApi'
import { accessLogKeys } from '../api/accessLogQueryKeys'
import { useAccessLogs } from './useAccessLogs'
import { useAuditSearchParams } from './useAuditSearchParams'

vi.mock('../api/accessLogsApi', () => ({
  fetchAccessLogs: vi.fn(),
}))

const fetchAccessLogsMock = vi.mocked(fetchAccessLogs)

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })
}

function createQueryWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createAuditWrapper(initialEntry: string, queryClient?: QueryClient) {
  return function AuditWrapper({ children }: { children: ReactNode }) {
    const content = queryClient
      ? <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      : children

    return <MemoryRouter initialEntries={[initialEntry]}>{content}</MemoryRouter>
  }
}

function useAuditSearchParamsWithLocation() {
  return { ...useAuditSearchParams(), location: useLocation() }
}

function useAppliedAccessLogs(draft: AccessLogFilters) {
  const auditSearch = useAuditSearchParams()
  const accessLogs = useAccessLogs(auditSearch.filters)
  return { ...auditSearch, ...accessLogs, draft }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('access-log query keys', () => {
  it.each([
    { changed: { lines: 201 }, name: 'lines' },
    { changed: { status: 404 }, name: 'status' },
    { changed: { method: 'POST' }, name: 'method' },
    { changed: { pathContains: '/billing' }, name: 'pathContains' },
  ])('isolates the cache when $name changes', ({ changed }) => {
    expect(accessLogKeys.list({ lines: 200 })).not.toEqual(accessLogKeys.list(changed))
  })
})

describe('useAuditSearchParams', () => {
  it('normalizes default, deep-linked, and invalid URL filter values safely', () => {
    const defaults = renderHook(() => useAuditSearchParams(), {
      wrapper: createAuditWrapper('/?keep=visible'),
    })
    const deepLink = renderHook(() => useAuditSearchParams(), {
      wrapper: createAuditWrapper('/?lines=500&status=404&method=post&pathContains=%20%2Fbilling%20'),
    })
    const invalid = renderHook(() => useAuditSearchParams(), {
      wrapper: createAuditWrapper('/?lines=0&status=not-a-status&method=%20%20&pathContains=%20%20'),
    })

    expect(defaults.result.current.filters).toEqual({ lines: 200 })
    expect(deepLink.result.current.filters).toEqual({
      lines: 500,
      status: 404,
      method: 'POST',
      pathContains: '/billing',
    })
    expect(invalid.result.current.filters).toEqual({ lines: 200 })
  })

  it('replaces all applied filters together without dropping unrelated URL state', () => {
    const { result } = renderHook(() => useAuditSearchParamsWithLocation(), {
      wrapper: createAuditWrapper('/?keep=visible&lines=25&status=500&method=GET&pathContains=%2Fold'),
    })

    act(() => {
      result.current.setFilters({
        lines: 500,
        status: 404,
        method: ' post ',
        pathContains: ' /billing ',
      })
    })

    const params = new URLSearchParams(result.current.location.search)
    expect(result.current.filters).toEqual({
      lines: 500,
      status: 404,
      method: 'POST',
      pathContains: '/billing',
    })
    expect(params.get('keep')).toBe('visible')
    expect(params.get('lines')).toBe('500')
    expect(params.get('status')).toBe('404')
    expect(params.get('method')).toBe('POST')
    expect(params.get('pathContains')).toBe('/billing')
  })
})

describe('useAccessLogs', () => {
  it('keeps applied filter combinations isolated and reuses a fresh cache entry', async () => {
    fetchAccessLogsMock.mockImplementation((filters) => Promise.resolve([{
      kind: 'raw',
      raw: JSON.stringify(filters),
    }]))
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ filters }: { filters: AccessLogFilters }) => useAccessLogs(filters),
      { wrapper: createQueryWrapper(queryClient), initialProps: { filters: { status: 200 } } },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(result.current.data?.[0]).toEqual({ kind: 'raw', raw: '{"lines":200,"status":200}' })

    rerender({ filters: { status: 404 } })
    await waitFor(() => { expect(result.current.data?.[0]?.kind).toBe('raw') })
    expect(result.current.data?.[0]).toEqual({ kind: 'raw', raw: '{"lines":200,"status":404}' })

    rerender({ filters: { status: 200 } })
    await waitFor(() => {
      expect(result.current.data?.[0]).toEqual({ kind: 'raw', raw: '{"lines":200,"status":200}' })
    })

    expect(fetchAccessLogsMock).toHaveBeenCalledTimes(2)
    expect(queryClient.getQueryData(accessLogKeys.list({ status: 200 }))).toEqual([
      { kind: 'raw', raw: '{"lines":200,"status":200}' },
    ])
    expect(queryClient.getQueryData(accessLogKeys.list({ status: 404 }))).toEqual([
      { kind: 'raw', raw: '{"lines":200,"status":404}' },
    ])
  })

  it('exposes manual refetch and background-fetch state without a polling interval', async () => {
    let resolveRefresh: ((value: Awaited<ReturnType<typeof fetchAccessLogs>>) => void) | undefined
    const refresh = new Promise<Awaited<ReturnType<typeof fetchAccessLogs>>>((resolve) => {
      resolveRefresh = resolve
    })
    fetchAccessLogsMock
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(refresh)
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useAccessLogs(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    let refetchPromise: ReturnType<typeof result.current.refetch> | undefined
    act(() => { refetchPromise = result.current.refetch() })

    await waitFor(() => { expect(result.current.isBackgroundFetching).toBe(true) })
    expect(queryClient.getQueryCache().find({ queryKey: accessLogKeys.list() })?.options.refetchInterval).toBeUndefined()

    resolveRefresh?.([])
    await act(async () => { await refetchPromise })
    await waitFor(() => { expect(result.current.isBackgroundFetching).toBe(false) })
  })

  it('does not request again while only draft filter state changes', async () => {
    fetchAccessLogsMock.mockResolvedValue([])
    const queryClient = createQueryClient()
    const { result, rerender } = renderHook(
      ({ draft }: { draft: AccessLogFilters }) => useAppliedAccessLogs(draft),
      {
        wrapper: createAuditWrapper('/?lines=200', queryClient),
        initialProps: { draft: { method: 'GET' } },
      },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    rerender({ draft: { method: 'POST', pathContains: '/billing' } })

    expect(result.current.filters).toEqual({ lines: 200 })
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
  })
})
