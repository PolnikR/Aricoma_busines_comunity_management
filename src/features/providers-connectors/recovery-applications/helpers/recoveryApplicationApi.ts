import type { RecoveryApplication, RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const RECOVERY_APPS_ENDPOINT = '/api/recovery-applications'

export async function fetchRecoveryApplications(): Promise<RecoveryApplication[]> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery applications: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchRecoveryApplication(id: string): Promise<RecoveryApplication> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery application: ${response.statusText}`)
  }
  return response.json()
}

export async function createRecoveryApplication(data: RecoveryApplicationData): Promise<RecoveryApplication> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create recovery application: ${response.statusText}`)
  }
  return response.json()
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
  return response.json()
}

export async function deleteRecoveryApplication(id: string): Promise<void> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete recovery application: ${response.statusText}`)
  }
}
