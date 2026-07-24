import type { RecoveryApplication, RecoveryApplicationData, ApplicationSubmission } from '@/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes'

const apps = new Map<string, RecoveryApplication>()

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

function initializeSeededData() {
  const seededApps: RecoveryApplication[] = [
    {
      id: 'app-001',
      data: {
        application: {
          name: 'Production ERP System',
          description: 'Critical ERP application for order processing',
          environment: 'prod',
          provider_id: 'vcenter-01',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {
            'tier-1': {
              name: 'Database Tier',
              order: 1,
              description: 'Primary database servers',
              vms: [{ name: 'vm-001' }],
            },
            'tier-2': {
              name: 'Application Tier',
              order: 2,
              description: 'Application servers',
              vms: [{ name: 'vm-002' }, { name: 'vm-003' }],
            },
          },
        },
      },
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'app-002',
      data: {
        application: {
          name: 'Data Analytics Platform',
          description: 'Business intelligence and reporting',
          environment: 'staging',
          provider_id: 'vcenter-01',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {
            'tier-1': {
              name: 'Analytics Cluster',
              order: 1,
              description: 'Analytics processing servers',
              vms: [{ name: 'vm-004' }, { name: 'vm-005' }],
            },
          },
        },
      },
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
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
