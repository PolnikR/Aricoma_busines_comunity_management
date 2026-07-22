import type { RecoveryApplication, RecoveryApplicationData, ApplicationSubmission } from '../model/recoveryApplicationTypes'

const RECOVERY_APPS_ENDPOINT = '/api/recovery-applications'

export interface SubmitDagResponse {
  status: string
  filename: string
  remote_path: string
}

export async function fetchRecoveryApplications(): Promise<RecoveryApplication[]> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery applications: ${response.statusText}`)
  }
  return response.json() as Promise<RecoveryApplication[]>
}

export async function fetchRecoveryApplication(id: string): Promise<RecoveryApplication> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery application: ${response.statusText}`)
  }
  return response.json() as Promise<RecoveryApplication>
}

// Submits the application JSON to the Airflow recovery-orchestration DAG.
// In dev the /api prefix is proxied to the backend (see vite.config.ts),
// so this becomes POST http://<backend>/submit_dag?filename=<name>.
export async function submitRecoveryApplicationDag(name: string, data: RecoveryApplicationData): Promise<SubmitDagResponse> {
  const response = await fetch(`/api/submit_dag?filename=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to submit recovery application: ${String(response.status)} ${response.statusText}`)
  }
  return response.json() as Promise<SubmitDagResponse>
}

export async function createRecoveryApplication(data: RecoveryApplicationData, submission?: ApplicationSubmission): Promise<RecoveryApplication> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission ? { ...data, submission } : data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create recovery application: ${response.statusText}`)
  }
  return response.json() as Promise<RecoveryApplication>
}

export async function updateRecoveryApplication(id: string, data: RecoveryApplicationData): Promise<RecoveryApplication> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to update recovery application: ${response.statusText}`)
  }
  return response.json() as Promise<RecoveryApplication>
}

export async function deleteRecoveryApplication(id: string): Promise<void> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete recovery application: ${response.statusText}`)
  }
}
