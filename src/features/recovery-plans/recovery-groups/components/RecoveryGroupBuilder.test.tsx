import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => ({
    data: [
      {
        id: 'vmware-vcenter-01',
        name: 'Production vCenter',
        description: 'Primary VMware provider',
        type: 'VMWARE',
        ipAddress: '10.99.99.40',
        credentialId: 'vcenter-admin',
        credentialStatus: 'ok',
      },
      {
        id: 'ibm-power-01',
        name: 'IBM Power Source',
        description: 'Primary IBM Power provider',
        type: 'IBM_POWER',
        ipAddress: '10.99.99.50',
        credentialId: 'ibm-power-admin',
        credentialStatus: 'ok',
      },
      {
        id: 'ibm-flashsystem-01',
        name: 'IBM FlashSystem Source',
        description: 'Primary FlashSystem provider',
        type: 'FLASHCOPY',
        ipAddress: '10.99.99.246',
        credentialId: 'ibm-admin',
        credentialStatus: 'ok',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))
vi.mock('../hooks/useRecoveryGroupResourceInventory', () => ({
  useRecoveryGroupResourceInventory: () => ({
    data: { resourceNames: ['VOL-01'] },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        policyIds: ['medium-6h'],
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const existingGroup: RecoveryGroup = {
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

const existingStorageGroup: RecoveryGroup = {
  id: 'storage_group',
  name: 'Storage group',
  description: 'Production storage',
  sourceCategory: 'storage_system',
  workloadType: 'ibm_flashsystem',
  resourceType: 'volume',
  providerId: 'ibm-flashsystem-01',
  policySetId: 'tier2-apps',
  resources: ['VOL-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  resourceCount: 1,
  status: 'Active',
}

describe('RecoveryGroupBuilder', () => {
  it('uses a dedicated provider step between resource type and resources', () => {
    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resource type' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resources' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Policy Set' })).toBeInTheDocument()
  })

  it('allows a virtual-machine group to be created without optional related storage', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
    }))
  })

  it('adds manually selected FlashSystem volumes to a virtual-machine group', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: /IBM FlashSystem Source/i }))

    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), {
      dataTransfer: { getData: () => 'VOL-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      policySetId: 'tier2-apps',
    }))
  })

  it('keeps a FlashSystem volume group on the five-step flow', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingStorageGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Related storage' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))

    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
  })

  it('can clear the optional FlashSystem mapping before saving', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={{
          ...existingGroup,
          relatedVolumeProviderId: 'ibm-flashsystem-01',
          relatedVolumes: ['VOL-01'],
        }}
        onCreate={onCreate}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: 'Clear related storage' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
    }))
  })

  it('reports unsaved changes when group details change', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()

    render(
      <RecoveryGroupBuilder
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    )

    await user.type(screen.getByLabelText('Group name *'), 'Database group')

    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('locks the resource configuration while editing an existing group', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Resource type' }))

    expect(screen.getByRole('button', { name: /VMware virtual machines/i })).toBeDisabled()
    await user.click(screen.getByRole('tab', { name: 'Storage systems' }))
    expect(screen.getByRole('button', { name: /VMware virtual machines/i })).toBeInTheDocument()
  })

  it('requires a matching provider before enabling the resources step', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Group name *'), 'Database group')
    await user.type(screen.getByLabelText('Description *'), 'Production databases')
    await user.click(screen.getByRole('button', { name: 'Resource type' }))
    await user.click(screen.getByRole('button', { name: /VMware virtual machines/i }))

    const resourcesStep = screen.getByRole('button', { name: 'Resources' })
    expect(resourcesStep).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Provider' }))
    await user.click(screen.getByRole('button', { name: /Production vCenter/i }))

    expect(resourcesStep).toBeEnabled()
  })
})
