import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupEditorPage } from './RecoveryGroupEditorPage'

const navigate = vi.fn()
const update = vi.fn()
const group: RecoveryGroup = {
  id: 'database_group',
  name: 'Database group',
  description: 'Production databases',
  sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines',
  resourceType: 'vm',
  providerId: 'vmware-vcenter-01',
  policySetId: 'tier2-apps',
  resources: ['DB-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  resourceCount: 1,
  status: 'Active',
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'database_group' }),
    useBlocker: () => ({ state: 'unblocked' as const }),
  }
})

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: () => ({ groups: [group], update }),
}))

vi.mock('../components/RecoveryGroupBuilder', () => ({
  RecoveryGroupBuilder: ({
    initialData,
    submitLabel,
    onCreate,
  }: {
    initialData: RecoveryGroup
    submitLabel: string
    onCreate: (draft: RecoveryGroupDraft) => void
  }) => (
    <div>
      <span>{initialData.name}</span>
      <span>{submitLabel}</span>
      <button
        type="button"
        onClick={() => {
          onCreate({
            id: initialData.id,
            name: 'Updated group',
            description: initialData.description,
            sourceCategory: initialData.sourceCategory,
            workloadType: initialData.workloadType,
            resourceType: initialData.resourceType,
            providerId: initialData.providerId,
            policySetId: initialData.policySetId,
            resources: initialData.resources,
            orchestrationProviderId: 'airflow-01',
            pushToOrchestrator: false,
          })
        }}
      >
        Submit edit
      </button>
    </div>
  ),
}))

describe('RecoveryGroupEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prefills the builder and updates the existing recovery group', async () => {
    const user = userEvent.setup()
    render(<RecoveryGroupEditorPage />)

    expect(screen.getByText('Database group')).toBeInTheDocument()
    expect(screen.getByText('Save Recovery Group')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit edit' }))

    expect(update).toHaveBeenCalledWith(
      'database_group',
      expect.objectContaining({ name: 'Updated group' }),
    )
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
  })
})
