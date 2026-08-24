import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'
import { useRecoveryGroupRelatedVolumes } from '../hooks/useRecoveryGroupRelatedVolumes'

const { usePlatformProvidersMock } = vi.hoisted(() => ({ usePlatformProvidersMock: vi.fn() }))

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
        port: 22,
        credentialId: 'vcenter-admin',
        role: 'source',
        defaultFlashcopyProviderId: 'ibm-flashsystem-01',
        credentialStatus: 'ok',
      },
      {
        id: 'vmware-vcenter-target-01',
        name: 'Recovery vCenter',
        description: 'Target VMware provider',
        type: 'VMWARE',
        ipAddress: '10.99.99.41',
        port: 22,
        credentialId: 'vcenter-target-admin',
        role: 'target',
        credentialStatus: 'ok',
      },
      {
        id: 'ibm-power-01',
        name: 'IBM Power Source',
        description: 'Primary IBM Power provider',
        type: 'IBM_POWER',
        ipAddress: '10.99.99.50',
        port: 22,
        credentialId: 'ibm-power-admin',
        role: 'source',
        credentialStatus: 'ok',
      },
      {
        id: 'ibm-flashsystem-01',
        name: 'IBM FlashSystem Source',
        description: 'Primary FlashSystem provider',
        type: 'FLASHCOPY',
        ipAddress: '10.99.99.246',
        port: 22,
        credentialId: 'ibm-admin',
        role: 'source',
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
vi.mock('../hooks/useRecoveryGroupRelatedVolumes', () => ({
  useRecoveryGroupRelatedVolumes: vi.fn(() => ({
    flashcopyProviderId: null,
    discoveredVolumeNames: [],
    isLoading: false,
  })),
}))
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        snapshotPolicyId: 'medium-6h',
        recoveryAppPolicyId: 'critical-daily-latest',
        cleanRoomPolicyId: 'enforce-clean-target',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [{
      id: 'medium-6h',
      name: 'Medium — 6h',
      description: 'Medium-tier snapshot cadence.',
      level: 'medium',
      frequencyValue: 6,
      frequencyUnit: 'hours',
      retentionValue: 7,
      retentionUnit: 'days',
      maxSnapshots: null,
      enabled: true,
    }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies', () => ({
  useRecoveryAppPolicies: () => ({
    data: [{
      id: 'critical-daily-latest',
      name: 'Critical — Daily DR Test',
      description: 'Daily recovery validation.',
      level: 'critical',
      frequencyValue: 1,
      frequencyUnit: 'days',
      retentionValue: 4,
      retentionUnit: 'hours',
      bootVerify: true,
      snapshotSelectionMode: 'latest',
      snapshotMaxAgeValue: null,
      snapshotMaxAgeUnit: null,
      snapshotTargetTime: null,
      enabled: true,
    }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies', () => ({
  useCleanRoomPolicies: () => ({
    data: [{
      id: 'enforce-clean-target',
      name: 'Enforce Clean Target',
      description: 'Remove conflicting target resources before recovery.',
      enabled: true,
    }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: usePlatformProvidersMock,
}))

const defaultPlatformProvidersResult = {
    data: [{
      id: 'airflow-01',
      name: 'Primary Airflow',
      description: 'Primary orchestrator',
      type: 'AIRFLOW',
      ipAddress: '10.99.99.60',
      port: 8080,
      dagDir: '/opt/airflow/dags',
      credentialId: 'airflow-admin',
      credentialStatus: 'ok',
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
}
usePlatformProvidersMock.mockReturnValue(defaultPlatformProvidersResult)

async function completeOrchestrationAndCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('switch', { name: 'Deploy to orchestrator' }))
  await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
}

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
  beforeEach(() => {
    usePlatformProvidersMock.mockReturnValue(defaultPlatformProvidersResult)
  })

  it('preserves the existing orchestration provider when multiple providers are available', async () => {
    usePlatformProvidersMock.mockReturnValue({
      data: [
        {
          id: 'airflow-01',
          name: 'Primary Airflow',
          description: 'Primary orchestrator',
          type: 'AIRFLOW',
          ipAddress: '10.99.99.60',
          port: 8080,
          dagDir: '/opt/airflow/dags',
          credentialId: 'airflow-admin',
          credentialStatus: 'ok',
        },
        {
          id: 'airflow-02',
          name: 'Secondary Airflow',
          description: 'Secondary orchestrator',
          type: 'AIRFLOW',
          ipAddress: '10.99.99.61',
          port: 8080,
          dagDir: '/opt/airflow/dags',
          credentialId: 'airflow-admin',
          credentialStatus: 'ok',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupBuilder
        initialData={{ ...existingGroup, orchestrationProviderId: 'airflow-02', pushToOrchestrator: true }}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))

    expect(screen.getByRole('combobox')).toHaveValue('airflow-02')
  })

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
    expect(screen.getByRole('button', { name: 'Orchestration' })).toBeInTheDocument()
  })

  it('allows a virtual-machine group to be created without optional related storage', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({
      flashcopyProviderId: null,
      discoveredVolumeNames: [],
      isLoading: false,
    })
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
    expect(screen.getByRole('region', { name: 'Selected policy set details' })).toHaveTextContent('Critical — Daily DR Test')
    await completeOrchestrationAndCreate(user)

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    }))
  })

  it('auto-populates related storage discovered for the selected virtual machines', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({
      flashcopyProviderId: 'ibm-flashsystem-01',
      discoveredVolumeNames: ['VOL-01'],
      isLoading: false,
    })
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

    expect((await screen.findAllByText('VOL-01')).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await completeOrchestrationAndCreate(user)

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      policySetId: 'tier2-apps',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    }))
  })

  it('lets the user add FlashSystem volumes beyond what was auto-discovered', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({
      flashcopyProviderId: 'ibm-flashsystem-01',
      discoveredVolumeNames: [],
      isLoading: false,
    })
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

    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), {
      dataTransfer: { getData: () => 'VOL-01' },
    })
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await completeOrchestrationAndCreate(user)

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      policySetId: 'tier2-apps',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    }))
  })

  it('enables Create once a provider is selected, without touching the orchestration toggle', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingStorageGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('switch', { name: 'Deploy to orchestrator' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
  })

  it('keeps a FlashSystem volume group on the six-step flow', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('switch', { name: 'Deploy to orchestrator' }))

    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
  })

  it('can clear the optional FlashSystem mapping before saving', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({
      flashcopyProviderId: null,
      discoveredVolumeNames: [],
      isLoading: false,
    })
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
    await completeOrchestrationAndCreate(user)

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      policySetId: 'tier2-apps',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
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

  it('offers only source providers while creating a recovery group', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Provider' }))

    expect(screen.getByRole('button', { name: /Production vCenter/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recovery vCenter/i })).not.toBeInTheDocument()
  })
})
