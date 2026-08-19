import { describe, expect, it } from 'vitest'
import type { RecoveryAppRecordOutput, RecoveryAppsResponseOutput } from '@/generated/api/zod.gen'
import { mapRecoveryApplications, toRecoveryApplicationJson } from './mapRecoveryApplications'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

function buildRecord(overrides: Partial<RecoveryAppRecordOutput> = {}): RecoveryAppRecordOutput {
  return {
    id: 'sample-app',
    application: {
      name: 'Sample app',
      description: 'Sample application',
      environment: 'prod',
      platform: 'vmware',
      source_connection: 'src-conn',
      target_connection: 'tgt-conn',
      tiers: {},
    },
    ...overrides,
  }
}

describe('mapRecoveryApplications', () => {
  it('maps orchestration_provider_id to orchestrationProviderId when present', () => {
    const payload: RecoveryAppsResponseOutput = {
      applications: [buildRecord({ orchestration_provider_id: 'airflow-01' })],
    }

    const [application] = mapRecoveryApplications(payload)

    expect(application.orchestrationProviderId).toBe('airflow-01')
  })

  it('omits orchestrationProviderId when the record has no orchestration_provider_id', () => {
    const payload: RecoveryAppsResponseOutput = {
      applications: [buildRecord()],
    }

    const [application] = mapRecoveryApplications(payload)

    expect(application.orchestrationProviderId).toBeUndefined()
  })
})

describe('toRecoveryApplicationJson', () => {
  it('carries orchestrationProviderId back to orchestration_provider_id when there is no rawRecord', () => {
    const application: RecoveryApplicationListItem = {
      id: 'sample-app',
      data: {
        application: {
          name: 'Sample app',
          description: 'Sample application',
          environment: 'prod',
          platform: 'vmware',
          source_connection: 'src-conn',
          target_connection: 'tgt-conn',
          tiers: {},
        },
      },
      orchestrationProviderId: 'airflow-01',
    }

    const payload = toRecoveryApplicationJson(application)

    expect(payload).toMatchObject({ orchestration_provider_id: 'airflow-01' })
  })
})
