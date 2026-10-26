import type { PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import type { RecoveryApplicationListItem } from '../../recovery-applications/model/recoveryApplicationTypes'
import type { RecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import { runsBody } from './stubOrchestratorRuns'

export const application: RecoveryApplicationListItem = {
  id: 'app / one',
  pushToOrchestrator: true,
  airflowRunId: 'run-1',
  orchestrationProviderId: 'airflow-01',
  data: { application: {
    name: 'Selected Application', environment: 'prod', platform: 'VMWARE',
    source_provider_id: 'source', target_provider_id: 'target', tiers: {},
  } },
}

export const group: RecoveryGroup = {
  id: 'group / one', name: 'Selected Group', description: '',
  sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem', resourceType: 'volume',
  providerId: 'storage', policySetId: '', resources: [], relatedVolumeProviderId: null,
  relatedVolumes: [], resourceCount: 0, status: 'Active',
  pushToOrchestrator: true, airflowRunId: 'run-1', orchestrationProviderId: 'airflow-01',
}

export const provider = { id: 'airflow-01', name: 'Airflow PROD', type: 'AIRFLOW', url: 'https://airflow.test' }

export function createQueryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false, gcTime: Infinity } } })
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, Wrapper }
}

// Stub only HTTP. Generated clients, response validation, selectors and observers stay real.
export function stubSelectedOrchestration(options: {
  providers?: () => Response | Promise<Response>
  latest?: (url: URL) => Response | Promise<Response>
} = {}) {
  const requests: URL[] = []
  vi.stubGlobal('fetch', (input: string) => {
    const url = new URL(input, 'http://localhost')
    requests.push(url)
    switch (url.pathname) {
      case '/api/get_platform_providers':
        return Promise.resolve(options.providers?.() ?? Response.json({ providers: [provider] }))
      case '/api/get_policy_sets':
        return Promise.resolve(Response.json({ policy_sets: [] }))
      case '/api/get_orchestrator_runs':
        return Promise.resolve(options.latest?.(url) ?? Response.json(runsBody([{ id: 'latest-1', state: 'success' }])))
      case '/api/get_recovery_app_inventory':
        return Promise.resolve(Response.json({
          recovery_app_id: 'app / one', recovery_app_name: 'Recovered Application',
          run_id: url.searchParams.get('run_id'), compute_provider_id: 'target', recovered_datastores: [], tiers: [],
        }))
      case '/api/get_recovery_group_inventory':
        return Promise.resolve(Response.json({
          recovery_group_id: 'group / one', recovery_group_name: 'Recovered Group',
          run_id: url.searchParams.get('run_id'), volumes: { 'restored-volume': { found: true, relations: [] } },
        }))
      default:
        return Promise.reject(new Error(`Unexpected request: ${url.pathname}`))
    }
  })
  return {
    requests,
    params: (path: string) => requests.filter(url => url.pathname === `/api/${path}`).map(url => Object.fromEntries(url.searchParams)),
  }
}

export function deferredResponse() {
  let resolve: (response: Response) => void = () => { throw new Error('Promise not initialized') }
  const promise = new Promise<Response>(finish => { resolve = finish })
  return { promise, resolve }
}
