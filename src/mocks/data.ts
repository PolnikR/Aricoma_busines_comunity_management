import type { RecoveryApplication, RecoveryApplicationData, ApplicationSubmission } from '@/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes'

const apps = new Map<string, RecoveryApplication>()

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

function initializeSeededData() {
  const seededApps: RecoveryApplication[] = []

  seededApps.forEach(app => {
    apps.set(app.id, app)
  })
}

export function getApps(): RecoveryApplication[] {
  if (apps.size === 0) {
    initializeSeededData()
  }
  return Array.from(apps.values())
}

export function getApp(id: string): RecoveryApplication | undefined {
  if (apps.size === 0) {
    initializeSeededData()
  }
  return apps.get(id)
}

export function createApp(data: RecoveryApplicationData, submission?: ApplicationSubmission): RecoveryApplication {
  const id = Math.random().toString(36).slice(2, 9)
  const now = getCurrentTimestamp()
  const app: RecoveryApplication = {
    id,
    data,
    ...(submission ? { submission } : {}),
    createdAt: now,
    updatedAt: now,
  }
  apps.set(id, app)
  return app
}

export function updateApp(id: string, data: RecoveryApplicationData): RecoveryApplication | undefined {
  if (!apps.has(id)) return undefined
  const existing = apps.get(id)
  if (!existing) return undefined
  const app: RecoveryApplication = {
    id,
    data,
    createdAt: existing.createdAt,
    updatedAt: getCurrentTimestamp(),
  }
  apps.set(id, app)
  return app
}

export function deleteApp(id: string): boolean {
  return apps.delete(id)
}

export function resetApps() {
  apps.clear()
}
