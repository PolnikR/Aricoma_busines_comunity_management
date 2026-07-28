import { z } from 'zod'
import { apiFetch } from '@/shared/api/apiClient'
import type {
  RecoveryApplicationData,
  RecoveryApplicationListItem,
} from '../model/recoveryApplicationTypes'

const GET_RECOVERY_APPS_ENDPOINT = '/api/get_recovery_apps'

const recoveryTierSchema = z.object({
  order: z.number(),
  description: z.string(),
  recovery_group: z.object({
    name: z.string(),
    description: z.string(),
    vms: z.array(z.object({
      name: z.string(),
    })),
  }),
})

const recoveryApplicationListResponseSchema = z.object({
  applications: z.array(z.object({
    name: z.string(),
    description: z.string(),
    environment: z.enum(['dev', 'staging', 'prod']),
    platform: z.string(),
    source_connection: z.string(),
    target_connection: z.string(),
    tiers: z.record(z.string(), recoveryTierSchema),
    file: z.string(),
  })),
})

export interface SubmitDagResponse {
  status: string
  filename: string
  remote_path: string
}

export async function fetchRecoveryApplications(): Promise<RecoveryApplicationListItem[]> {
  const response = await apiFetch(GET_RECOVERY_APPS_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery applications: ${response.statusText}`)
  }

  const payload: unknown = await response.json()
  const { applications } = recoveryApplicationListResponseSchema.parse(payload)

  return applications.map(({ file, tiers, ...application }) => ({
    id: file,
    data: {
      application: {
        ...application,
        tiers: Object.fromEntries(
          Object.entries(tiers).map(([id, tier]) => [
            id,
            {
              name: tier.recovery_group.name,
              order: tier.order,
              description: tier.description,
              recoveryGroupDescription: tier.recovery_group.description,
              vms: tier.recovery_group.vms,
            },
          ]),
        ),
      },
    },
  }))
}

// Submits the application JSON to the Airflow recovery-orchestration DAG.
// In dev the /api prefix is proxied to the backend (see vite.config.ts),
// so this becomes POST http://<backend>/submit_dag?filename=<name>.
export async function submitRecoveryApplicationDag(name: string, data: RecoveryApplicationData): Promise<SubmitDagResponse> {
  const url = `/api/submit_dag?filename=${encodeURIComponent(name)}`
  let response: Response
  try {
    response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (cause) {
    // Network-level failure (proxy unreachable, CORS, backend down, DNS).
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Network error calling ${url}: ${reason}`, { cause })
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`submit_dag failed: ${String(response.status)} ${response.statusText}${body ? ` — ${body}` : ''}`)
  }
  return response.json() as Promise<SubmitDagResponse>
}
