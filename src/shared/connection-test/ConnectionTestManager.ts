import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { getTestProviderQueryKey, getTestProviderQueryOptions } from '@/generated/query/providers/providers.gen'
import { getTestPlatformProviderQueryKey, getTestPlatformProviderQueryOptions } from '@/generated/query/platform-providers/platform-providers.gen'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'

export type ConnectionTestKind = 'infrastructure' | 'platform'
export type ConnectionTestRole = 'source' | 'target'
export type ConnectionTestPhase = 'pending' | 'complete' | 'error'

export interface ConnectionTestRun {
  identity: string
  kind: ConnectionTestKind
  providerId: string
  providerName: string
  providerRole?: ConnectionTestRole
  runId: number
  queryKey: QueryKey
  phase: ConnectionTestPhase
}

export interface ConnectionTestProviderState {
  run: ConnectionTestRun | null
  isResultOpen: boolean
}

export interface ConnectionTestSnapshot {
  visibleRunId: number | null
  notificationRunIds: readonly number[]
  blockedReason: 'capacity' | 'session' | null
}

export type StartTestResult =
  | { status: 'started' | 'existing'; runId: number }
  | { status: 'rejected'; reason: 'capacity' | 'session' }

const EMPTY_PROVIDER_STATE: ConnectionTestProviderState = { run: null, isResultOpen: false }

export class ConnectionTestManager {
  private readonly listeners = new Set<() => void>()
  private readonly runs = new Map<number, ConnectionTestRun>()
  private readonly currentByIdentity = new Map<string, number>()
  private readonly providerSnapshots = new Map<string, ConnectionTestProviderState>()
  private readonly inFlight = new Map<number, Promise<ProviderTestResponseOutput>>()
  private notificationRunIds: number[] = []
  private visibleRunId: number | null = null
  private blockedReason: ConnectionTestSnapshot['blockedReason'] = null
  private snapshot: ConnectionTestSnapshot = { visibleRunId: null, notificationRunIds: [], blockedReason: null }
  private nextRunId = 1
  private readonly queryClient: QueryClient
  private sessionScope: string | null
  private readonly maxSlots: number

  constructor(queryClient: QueryClient, sessionScope: string | null, maxSlots = 20) {
    this.queryClient = queryClient
    this.sessionScope = sessionScope
    this.maxSlots = maxSlots
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): ConnectionTestSnapshot => this.snapshot

  getProviderTestState = (kind: ConnectionTestKind, providerId: string): ConnectionTestProviderState =>
    this.providerSnapshots.get(this.identity(kind, providerId)) ?? EMPTY_PROVIDER_STATE

  getRun = (runId: number): ConnectionTestRun | null => this.runs.get(runId) ?? null

  getResult = (runId: number): ProviderTestResponseOutput | null => {
    const run = this.runs.get(runId)
    return run ? this.queryClient.getQueryData<ProviderTestResponseOutput>(run.queryKey) ?? null : null
  }

  getError = (runId: number): Error | null => {
    const run = this.runs.get(runId)
    const error: unknown = run ? this.queryClient.getQueryState(run.queryKey)?.error : null
    if (error == null) return null
    return error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Connection test failed')
  }

  startTest = (
    kind: ConnectionTestKind,
    providerId: string,
    providerName: string,
    providerRole?: ConnectionTestRole,
  ): StartTestResult => {
    if (!this.sessionScope) return this.reject('session')
    const identity = this.identity(kind, providerId)
    const previousId = this.currentByIdentity.get(identity)
    const previous = previousId === undefined ? null : this.runs.get(previousId) ?? null
    if (previous?.phase === 'pending') {
      this.openResult(previous.runId)
      return { status: 'existing', runId: previous.runId }
    }
    if (!previous && this.runs.size >= this.maxSlots) return this.reject('capacity')
    if (previous) this.forgetRun(previous.runId)

    const runId = this.nextRunId++
    const scope = this.sessionScope
    const params = { provider_id: providerId }
    const queryKey: QueryKey = [
      ...(kind === 'infrastructure' ? getTestProviderQueryKey(params) : getTestPlatformProviderQueryKey(params)),
      scope,
      runId,
    ]
    const run: ConnectionTestRun = {
      identity,
      kind,
      providerId,
      providerName,
      ...(kind === 'infrastructure' && providerRole ? { providerRole } : {}),
      runId,
      queryKey,
      phase: 'pending',
    }
    this.runs.set(runId, run)
    this.currentByIdentity.set(identity, runId)
    this.visibleRunId = runId
    this.blockedReason = null
    this.publish(identity)

    const query = {
      queryKey,
      retry: false as const,
      staleTime: 0,
      gcTime: Infinity,
      refetchOnWindowFocus: false as const,
      refetchOnMount: false as const,
      refetchOnReconnect: false as const,
      refetchInterval: false as const,
    }
    const options = kind === 'infrastructure'
      ? getTestProviderQueryOptions(params, { query })
      : getTestPlatformProviderQueryOptions(params, { query })
    const promise = this.queryClient.fetchQuery(options)
    this.inFlight.set(runId, promise)
    void promise.then(
      () => { this.settle(runId, scope, 'complete') },
      () => { this.settle(runId, scope, 'error') },
    )
    return { status: 'started', runId }
  }

  openResult = (runId: number): boolean => {
    const run = this.runs.get(runId)
    if (!run) return false
    const previousVisible = this.visibleRunId === null ? null : this.runs.get(this.visibleRunId)
    if (previousVisible && previousVisible.runId !== runId) this.closeResult()
    this.notificationRunIds = this.notificationRunIds.filter(id => id !== runId)
    this.visibleRunId = runId
    this.blockedReason = null
    if (previousVisible) this.publish(run.identity, previousVisible.identity)
    else this.publish(run.identity)
    return true
  }

  closeResult = (): void => {
    const run = this.visibleRunId === null ? null : this.runs.get(this.visibleRunId)
    if (!run) return
    this.visibleRunId = null
    if (run.phase !== 'pending') this.forgetRun(run.runId)
    this.publish(run.identity)
  }

  dismissNotification = (runId: number): void => {
    const run = this.runs.get(runId)
    if (!run || !this.notificationRunIds.includes(runId)) return
    this.forgetRun(runId)
    this.publish(run.identity)
  }

  clearBlockedReason = (): void => {
    if (this.blockedReason === null) return
    this.blockedReason = null
    this.publish()
  }

  setSessionScope = (scope: string | null): void => {
    if (this.sessionScope === scope) return
    const identities = [...this.currentByIdentity.keys()]
    for (const run of this.runs.values()) {
      this.queryClient.removeQueries({ queryKey: run.queryKey, exact: true })
    }
    this.runs.clear()
    this.currentByIdentity.clear()
    this.inFlight.clear()
    this.notificationRunIds = []
    this.visibleRunId = null
    this.blockedReason = null
    this.sessionScope = scope
    this.publish(...identities)
  }

  private settle(runId: number, scope: string | null, phase: ConnectionTestPhase): void {
    this.inFlight.delete(runId)
    const run = this.runs.get(runId)
    if (!run || this.sessionScope !== scope || this.currentByIdentity.get(run.identity) !== runId) return
    this.runs.set(runId, { ...run, phase })
    if (this.visibleRunId !== runId) this.notificationRunIds.push(runId)
    this.publish(run.identity)
  }

  private forgetRun(runId: number): void {
    const run = this.runs.get(runId)
    if (!run) return
    this.runs.delete(runId)
    this.currentByIdentity.delete(run.identity)
    this.notificationRunIds = this.notificationRunIds.filter(id => id !== runId)
    this.queryClient.removeQueries({ queryKey: run.queryKey, exact: true })
  }

  private reject(reason: 'capacity' | 'session'): StartTestResult {
    this.blockedReason = reason
    this.publish()
    return { status: 'rejected', reason }
  }

  private identity(kind: ConnectionTestKind, providerId: string): string {
    return `${kind}:${providerId}`
  }

  private publish(...identities: string[]): void {
    for (const identity of identities) {
      const runId = this.currentByIdentity.get(identity)
      const run = runId === undefined ? null : this.runs.get(runId) ?? null
      this.providerSnapshots.set(identity, { run, isResultOpen: runId !== undefined && this.visibleRunId === runId })
    }
    this.snapshot = {
      visibleRunId: this.visibleRunId,
      notificationRunIds: this.notificationRunIds,
      blockedReason: this.blockedReason,
    }
    for (const listener of this.listeners) listener()
  }
}
