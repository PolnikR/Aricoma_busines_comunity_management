import { describe, expect, it } from 'vitest'
import {
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from './recoveryApplicationFormMapper'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

const application: RecoveryApplicationListItem = {
  id: 'Finance.json',
  data: {
    application: {
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {
        database: {
          order: 1,
          description: 'Database server tier',
          recovery_group: {
            name: 'database_group',
            description: 'Database recovery group',
            vms: [{ name: 'db-01' }],
          },
        },
      },
    },
  },
}

describe('recoveryApplicationFormMapper', () => {
  it('maps backend data to detached builder state', () => {
    const formState = toRecoveryApplicationFormState(application)

    expect(formState).toMatchObject({
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
    })
    expect(formState.tiers.get('database')).toEqual(application.data.application.tiers.database)

    formState.tiers.get('database')?.recovery_group?.vms.push({ name: 'db-02' })
    expect(application.data.application.tiers.database?.recovery_group?.vms).toEqual([{ name: 'db-01' }])
  })

  it('maps builder state to the submit_dag contract', () => {
    const data = toRecoveryApplicationData(toRecoveryApplicationFormState(application))

    expect(data).toEqual({
      application: {
        ...application.data.application,
        tiers: application.data.application.tiers,
      },
    })
  })

  it('preserves a tier without recovery_group', () => {
    const applicationWithoutGroup: RecoveryApplicationListItem = {
      ...application,
      data: {
        application: {
          ...application.data.application,
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
            },
          },
        },
      },
    }

    const formState = toRecoveryApplicationFormState(applicationWithoutGroup)
    expect(formState.tiers.get('database')).toEqual({
      order: 1,
      description: 'Database server tier',
    })
    expect(toRecoveryApplicationData(formState).application.tiers.database).toEqual({
      order: 1,
      description: 'Database server tier',
    })
  })
})
