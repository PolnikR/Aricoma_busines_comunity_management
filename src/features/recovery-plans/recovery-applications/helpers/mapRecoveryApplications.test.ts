import { describe, expect, it } from 'vitest'
import type { RecoveryAppRecordOutput, RecoveryAppsResponseOutput } from '@/generated/query/zod'
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
      target_provider_id: 'tgt-provider',
      tiers: {},
    },
    ...overrides,
  }
}

describe('mapRecoveryApplications', () => {
  it.each([undefined, null, 'deployed-2'])('preserves configured and deployed %s in raw and fallback JSON', deployed => {
    const record = buildRecord({ application: { ...buildRecord().application, dag_template_version: 'configured-3' }, orchestration: deployed === undefined ? {} : { template_version: deployed } })
    const item = mapRecoveryApplications({ applications: [record] })[0]
    if (!item) throw new Error('Expected mapped application')
    expect(item.deployedTemplateVersion).toBe(deployed)
    expect(item.data.application.dag_template_version).toBe('configured-3')
    expect(toRecoveryApplicationJson(item)).toEqual(record)
    const fallback = { ...item }
    delete fallback.rawRecord
    const json = toRecoveryApplicationJson(fallback)
    if (deployed !== undefined) expect(json).toHaveProperty('orchestration.template_version', deployed)
    expect(json).toHaveProperty('application.dag_template_version', 'configured-3')
  })
  function mapOne(overrides: Partial<RecoveryAppRecordOutput> = {}) {
    const payload: RecoveryAppsResponseOutput = { applications: [buildRecord(overrides)] }
    return mapRecoveryApplications(payload)[0]
  }

  it('maps the orchestration state to the internal orchestration fields', () => {
    const application = mapOne({
      orchestration: { run_id: '260811133132_fbffbefb', pushed: true, provider_id: 'airflow-01' },
    })

    expect(application?.airflowRunId).toBe('260811133132_fbffbefb')
    expect(application?.pushToOrchestrator).toBe(true)
    expect(application?.orchestrationProviderId).toBe('airflow-01')
  })

  it('keeps a null run id and provider id but drops a null pushed flag', () => {
    const application = mapOne({ orchestration: { run_id: null, pushed: null, provider_id: null } })

    expect(application?.airflowRunId).toBeNull()
    expect(application).not.toHaveProperty('pushToOrchestrator')
    expect(application?.orchestrationProviderId).toBeNull()
  })

  it.each([
    ['missing', {}],
    ['null', { orchestration: null }],
  ])('omits the orchestration fields when orchestration is %s', (_label, overrides) => {
    const application = mapOne(overrides)

    expect(application).not.toHaveProperty('airflowRunId')
    expect(application).not.toHaveProperty('pushToOrchestrator')
    expect(application).not.toHaveProperty('orchestrationProviderId')
  })
})

describe('toRecoveryApplicationJson', () => {
  const application: RecoveryApplicationListItem = {
    id: 'sample-app',
    data: {
      application: {
        name: 'Sample app',
        description: 'Sample application',
        environment: 'prod',
        platform: 'vmware',
        target_provider_id: 'tgt-provider',
        tiers: {},
      },
    },
  }

  it('nests the orchestration fields under orchestration when there is no rawRecord', () => {
    const payload = toRecoveryApplicationJson({
      ...application,
      airflowRunId: '260811133132_fbffbefb',
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    })

    expect(payload).toMatchObject({
      orchestration: { run_id: '260811133132_fbffbefb', pushed: true, provider_id: 'airflow-01' },
    })
    expect(payload).not.toHaveProperty('airflow_run_id')
    expect(payload).not.toHaveProperty('push_to_orchestrator')
    expect(payload).not.toHaveProperty('orchestration_provider_id')
  })

  it('omits orchestration when the application has no orchestration fields', () => {
    expect(toRecoveryApplicationJson(application)).not.toHaveProperty('orchestration')
  })
})
