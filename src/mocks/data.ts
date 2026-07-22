import type { RecoveryApplication, RecoveryApplicationData } from '@/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes'

const apps = new Map<string, RecoveryApplication>()

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

function initializeSeededData() {
  const now = getCurrentTimestamp()
  const seededApps: RecoveryApplication[] = [
    {
      id: '1',
      data: {
        application: {
          name: 'Production ERP System',
          description: 'Critical SAP ERP for finance operations',
          environment: 'prod',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {
            database: {
              name: 'Database',
              order: 1,
              description: 'Database server group',
              vms: [{ name: 'erp-db-prod-01' }, { name: 'erp-db-prod-02' }],
            },
            application: {
              name: 'Application',
              order: 3,
              description: 'Application server group',
              vms: [{ name: 'erp-app-prod-01' }, { name: 'erp-app-prod-02' }],
            },
            web: {
              name: 'Web',
              order: 4,
              description: 'Web server group',
              vms: [{ name: 'erp-web-prod-01' }],
            },
          },
        },
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '2',
      data: {
        application: {
          name: 'Customer Portal',
          description: 'Public-facing customer management portal',
          environment: 'prod',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {
            application: {
              name: 'Application',
              order: 3,
              description: 'Application server group',
              vms: [{ name: 'portal-app-01' }, { name: 'portal-app-02' }],
            },
            web: {
              name: 'Web',
              order: 4,
              description: 'Web server group',
              vms: [{ name: 'portal-web-01' }, { name: 'portal-web-02' }],
            },
          },
        },
      },
      createdAt: now,
      updatedAt: now,
    },
  ]

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

export function createApp(data: RecoveryApplicationData): RecoveryApplication {
  const id = Math.random().toString(36).slice(2, 9)
  const now = getCurrentTimestamp()
  const app: RecoveryApplication = {
    id,
    data,
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
