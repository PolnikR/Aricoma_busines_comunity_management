import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'
import { useRecoveryGroupMetroMirrorRelationships } from '../hooks/useRecoveryGroupMetroMirrorRelationships'
import { useRecoveryGroupRelatedVolumes } from '../hooks/useRecoveryGroupRelatedVolumes'

const { usePlatformProvidersMock } = vi.hoisted(() => ({ usePlatformProvidersMock: vi.fn() }))
const providerStatus = vi.hoisted(() => ({ isFetching: false }))

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({
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
        partnerProviderId: 'ibm-flashsystem-target',
        name: 'IBM FlashSystem Source',
        description: 'Primary FlashSystem provider',
        type: 'FLASHCOPY',
        ipAddress: '10.99.99.246',
        port: 22,
        credentialId: 'ibm-admin',
        role: 'source',
        credentialStatus: 'ok',
      },
      { id: 'ibm-flashsystem-target', name: 'Target FlashSystem', type: 'FLASHCOPY', role: 'target', credentialStatus: 'ok' },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...providerStatus,
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
vi.mock('../hooks/useRecoveryGroupMetroMirrorRelationships', () => ({ useRecoveryGroupMetroMirrorRelationships: vi.fn() }))
vi.mock('../hooks/useRecoveryGroupRelatedVolumes', () => ({
  useRecoveryGroupRelatedVolumes: vi.fn(() => ({
    flashcopyProviderId: null,
    discoveredVolumeNames: [],
    isLoading: false,
    isResolved: true,
  })),
}))
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({
  useGetPolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        snapshot_policy_id: 'medium-6h',
        recovery_app_policy_id: 'critical-daily-latest',
        clean_room_policy_id: 'enforce-clean-target',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))
vi.mock('@/generated/query/snapshot-policies/snapshot-policies.gen', () => ({
  useGetPolicies: () => ({
    data: [{
      id: 'medium-6h',
      name: 'Medium — 6h',
      description: 'Medium-tier snapshot cadence.',
      level: 'medium',
      frequency_value: 6,
      frequency_unit: 'hours',
      retention_value: 7,
      retention_unit: 'days',
      max_snapshots: null,
      enabled: true,
    }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({
  useGetRecoveryAppPolicies: () => ({
    data: [{
      id: 'critical-daily-latest',
      name: 'Critical — Daily DR Test',
      description: 'Daily recovery validation.',
      level: 'critical',
      frequency_value: 1,
      frequency_unit: 'days',
      retention_value: 4,
      retention_unit: 'hours',
      boot_verify: true,
      snapshot_selection_mode: 'latest',
      snapshot_max_age_value: null,
      snapshot_max_age_unit: null,
      snapshot_target_time: null,
      enabled: true,
    }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('@/generated/query/clean-room-policies/clean-room-policies.gen', () => ({
  useGetCleanRoomPolicies: () => ({
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
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: usePlatformProvidersMock,
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
  it('disables lookup for Local and waits for VM discovery before looking up selected source volumes', async () => {
    const mock = vi.mocked(useRecoveryGroupMetroMirrorRelationships)
    const props = { initialData: { ...existingGroup, relatedVolumeProviderId: 'ibm-flashsystem-01' }, onCreate: vi.fn(), onCancel: vi.fn() }
    const { rerender } = render(<RecoveryGroupBuilder {...props} />)
    expect(mock).toHaveBeenLastCalledWith('ibm-flashsystem-01', [], false)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'metro_mirror')
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({ flashcopyProviderId: 'ibm-flashsystem-01', discoveredVolumeNames: [], isLoading: true, isResolved: false })
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(mock).toHaveBeenLastCalledWith('ibm-flashsystem-01', [], false)
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({ flashcopyProviderId: 'ibm-flashsystem-01', discoveredVolumeNames: ['VOL-01'], isLoading: false, isResolved: true })
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(mock).toHaveBeenLastCalledWith('ibm-flashsystem-01', ['VOL-01'], true)
  })

  it('preserves saved values during refetch but resets overrides after changing Source', async () => {
    const lookup = { provider_id: 'ibm-flashsystem-01', consistency_group_id: 'AUTO-CG', volumes: [{ name: 'VOL-01', status: 'ok' as const, auxiliary_name: 'AUTO-AUX' }] }
    vi.mocked(useRecoveryGroupMetroMirrorRelationships).mockReturnValue({ data: lookup, error: null, isLoading: false, refetch: vi.fn() })
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: 'SAVED-CG', auxiliaryNamesByVolume: { 'VOL-01': 'SAVED-AUX' } }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('SAVED-CG')
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('SAVED-AUX')
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-target')
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL-01' } })
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('AUTO-CG')
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('AUTO-AUX')
  })

  it.each(['vm', 'volume'] as const)('prefills %s storage and retains manual changes on refetch and submit', async kind => {
    const lookup = { provider_id: 'ibm-flashsystem-01', consistency_group_id: '001', volumes: [{ name: 'VOL-01', status: 'ok' as const, auxiliary_name: 'AUTO-AUX' }] }
    const mock = vi.mocked(useRecoveryGroupMetroMirrorRelationships)
    mock.mockReturnValue({ data: lookup, error: null, isLoading: false, refetch: vi.fn() })
    const initialData: RecoveryGroup = { ...(kind === 'vm' ? existingGroup : existingStorageGroup), topology: 'metro_mirror', metroMirrorMode: 'existing', relatedVolumeProviderId: 'ibm-flashsystem-01', relatedVolumes: ['VOL-01'] }
    const props = { initialData, onCreate: vi.fn(), onCancel: vi.fn() }
    const { rerender } = render(<RecoveryGroupBuilder {...props} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: kind === 'vm' ? 'Related storage' : 'Resources' }))
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('001')
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('AUTO-AUX')
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: '009' } })
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: VOL-01'), { target: { value: '' } })
    mock.mockReturnValue({ data: { ...lookup, consistency_group_id: '002' }, error: null, isLoading: false, refetch: vi.fn() })
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('009')
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: VOL-01'), { target: { value: 'MANUAL-AUX' } })
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({ consistencyGroupId: '009', auxiliaryNamesByVolume: { 'VOL-01': 'MANUAL-AUX' } }))
  })

  it('allows complete manual input when relationship lookup fails', async () => {
    const retry = vi.fn()
    vi.mocked(useRecoveryGroupMetroMirrorRelationships).mockReturnValue({ data: undefined, error: new Error('Offline'), isLoading: false, refetch: retry })
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'existing' }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Resources' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: '001' } })
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: VOL-01'), { target: { value: 'AUX' } })
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Review configuration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('requires Topology and Source before allowing later steps for a new group', async () => {
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder onCreate={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('Group name *'), 'New group')
    await user.type(screen.getByLabelText('Description *'), 'Description')
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Resource type' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'local')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('preserves Topology and Source when the workload category changes', async () => {
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder onCreate={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('Group name *'), 'New group')
    await user.type(screen.getByLabelText('Description *'), 'Description')
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'metro_mirror')
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
    expect(screen.queryByLabelText('Consistency group ID')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('tab', { name: /Storage volumes/i }))
    await user.click(screen.getByRole('button', { name: /IBM FlashSystemGroup storage volumes/i }))
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    expect(screen.getByLabelText('Topology mode')).toHaveValue('metro_mirror')
    expect(screen.getByLabelText('Source FlashSystem provider')).toHaveValue('ibm-flashsystem-01')
    expect(screen.queryByLabelText('Consistency group ID')).not.toBeInTheDocument()
  })

  it('describes related auxiliary inputs with inline guidance only while names are missing', async () => {
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder initialData={{ ...existingGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001', relatedVolumeProviderId: 'ibm-flashsystem-01', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: {} }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    const input = screen.getByLabelText('Auxiliary volume name: VOL-01')
    expect(input).toHaveAccessibleDescription('Enter an auxiliary name for every selected Metro Mirror volume.')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(input, 'AUX-01')
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByText('Enter an auxiliary name for every selected Metro Mirror volume.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('AUX-01')
  })

  it('requires auxiliary for every Metro volume and clears it when switched to Local', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001' }} onCreate={onCreate} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.type(screen.getByLabelText('Auxiliary volume name: VOL-01'), 'AUX-01')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'local')
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ topology: 'local', relatedVolumeProviderId: 'ibm-flashsystem-01', consistencyGroupId: '', auxiliaryNamesByVolume: {} }))
  })

  beforeEach(() => {
    vi.mocked(useRecoveryGroupMetroMirrorRelationships).mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() })
    providerStatus.isFetching = false
    usePlatformProvidersMock.mockReturnValue(defaultPlatformProvidersResult)
    vi.mocked(useRecoveryGroupRelatedVolumes).mockImplementation((_vmProvider, _vms, flashcopyProviderId) => ({ flashcopyProviderId, discoveredVolumeNames: [], isLoading: false, isResolved: true }))
  })

  it('blocks save during provider refresh without discarding the current draft', async () => {
    const props = { initialData: existingStorageGroup, onCreate: vi.fn(), onCancel: vi.fn() }
    const { rerender } = render(<RecoveryGroupBuilder {...props} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    providerStatus.isFetching = true
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeDisabled()
    providerStatus.isFetching = false
    rerender(<RecoveryGroupBuilder {...props} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(props.onCreate).toHaveBeenCalledWith(expect.objectContaining({ resources: ['VOL-01'] }))
  })

  it('offers and automatically selects only credential-valid Airflow providers', async () => {
    usePlatformProvidersMock.mockReturnValue({ ...defaultPlatformProvidersResult, data: [
      ...defaultPlatformProvidersResult.data,
      { ...defaultPlatformProvidersResult.data[0], id: 'smtp-01', name: 'Mail provider', type: 'SMTP' },
      { ...defaultPlatformProvidersResult.data[0], id: 'backend-01', name: 'Backend provider', type: 'BACKEND' },
      { ...defaultPlatformProvidersResult.data[0], id: 'keycloak-01', name: 'Identity provider', type: 'KEYCLOAK' },
      { ...defaultPlatformProvidersResult.data[0], id: 'airflow-invalid', name: 'Invalid Airflow', credentialStatus: 'invalid' },
    ] })
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, pushToOrchestrator: false }} onCreate={onCreate} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByRole('combobox')).toHaveValue('airflow-01')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Primary Airflow - AIRFLOW' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ orchestrationProviderId: 'airflow-01' }))
  })

  it('does not allow a previously selected non-Airflow platform provider to be submitted', async () => {
    usePlatformProvidersMock.mockReturnValue({ ...defaultPlatformProvidersResult, data: [
      { ...defaultPlatformProvidersResult.data[0], id: 'smtp-01', type: 'SMTP' },
    ] })
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, orchestrationProviderId: 'smtp-01', pushToOrchestrator: true }} onCreate={onCreate} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByText('No platform provider available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('keeps removed discovered volumes out after refetch and re-adds with an empty auxiliary input', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockImplementation((_vmProvider, _vms, flashcopyProviderId) => ({ flashcopyProviderId, discoveredVolumeNames: ['VOL-01'], isLoading: false, isResolved: true }))
    const user = userEvent.setup()
    const initialData: RecoveryGroup = { ...existingGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001', relatedVolumeProviderId: 'ibm-flashsystem-01', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' } }
    const props = { initialData, onCreate: vi.fn(), onCancel: vi.fn() }
    const { rerender } = render(<RecoveryGroupBuilder {...props} />)
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await user.click(screen.getByRole('button', { name: 'Remove volume: VOL-01' }))
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(screen.queryByLabelText('Auxiliary volume name: VOL-01')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Policy Set' })).toBeDisabled()
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL-01' } })
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('')
    await user.type(screen.getByLabelText('Auxiliary volume name: VOL-01'), 'NEW-AUX')
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL-01' } })
    expect(screen.getAllByLabelText('Auxiliary volume name: VOL-01')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    rerender(<RecoveryGroupBuilder {...props} />)
    expect(screen.queryByLabelText('Auxiliary volume name: VOL-01')).not.toBeInTheDocument()
  })

  it('clears storage context on Source change while preserving the VM and policy selection', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={{ ...existingGroup, topology: 'local', relatedVolumeProviderId: 'ibm-flashsystem-01', relatedVolumes: ['VOL-01'] }} onCreate={onCreate} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-target')
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ resources: ['DB-01'], providerId: existingGroup.providerId, policySetId: existingGroup.policySetId, relatedVolumeProviderId: 'ibm-flashsystem-target', relatedVolumes: [], auxiliaryNamesByVolume: {} }))
  })

  it('blocks save and later navigation when discovery fails, and offers retry', async () => {
    const retry = vi.fn()
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({ flashcopyProviderId: 'ibm-flashsystem-01', discoveredVolumeNames: [], isLoading: false, isResolved: true, error: new Error('Offline'), refetch: retry })
    render(<RecoveryGroupBuilder initialData={{ ...existingGroup, relatedVolumeProviderId: 'ibm-flashsystem-01' }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Orchestration' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('preserves explicitly selected source volumes and auxiliary names when adding a VM', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={{ ...existingGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001', relatedVolumeProviderId: 'ibm-flashsystem-01', relatedVolumes: ['MANUAL'], auxiliaryNamesByVolume: { MANUAL: 'AUX-MANUAL' } }} onCreate={onCreate} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    fireEvent.drop(screen.getByLabelText('Selected recovery group virtual machines'), { dataTransfer: { getData: () => 'VM-02' } })
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ resources: ['DB-01', 'VM-02'], relatedVolumes: ['MANUAL'], auxiliaryNamesByVolume: { MANUAL: 'AUX-MANUAL' } }))
  })

  it.each(['add', 'remove'])('drops discovered volumes after a manual %s and removal of their VM', async operation => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockImplementation((_vmProvider, vmNames, flashcopyProviderId) => ({
      flashcopyProviderId,
      discoveredVolumeNames: vmNames.flatMap(name => name === 'VM-A' ? ['DISK-A'] : name === 'VM-B' ? ['DISK-B'] : []),
      isLoading: false,
      isResolved: true,
    }))
    const user = userEvent.setup()
    const initialData: RecoveryGroup = {
      ...existingGroup,
      resources: ['VM-A', 'VM-B'],
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['MANUAL'],
      topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001',
      auxiliaryNamesByVolume: { 'DISK-A': 'AUX-A', 'DISK-B': 'AUX-B', MANUAL: 'AUX-MANUAL' },
    }
    const onCreate = vi.fn()
    render(<RecoveryGroupBuilder initialData={initialData} onCreate={onCreate} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.getByLabelText('Auxiliary volume name: DISK-A')).toHaveValue('AUX-A')
    expect(screen.getByLabelText('Auxiliary volume name: DISK-B')).toHaveValue('AUX-B')
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'EXTRA' } })
    if (operation === 'remove') {
      await user.click(screen.getByRole('button', { name: 'Remove volume: EXTRA' }))
    }
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Remove virtual machine: VM-A' }))
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.queryByLabelText('Auxiliary volume name: DISK-A')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Auxiliary volume name: DISK-B')).toHaveValue('AUX-B')
    expect(screen.getByLabelText('Auxiliary volume name: MANUAL')).toHaveValue('AUX-MANUAL')
  })

  it('clears auxiliary when a volume-only resource is removed and added again', async () => {
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: '001', auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' } }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await user.click(screen.getByRole('button', { name: 'Remove volume: VOL-01' }))
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL-01' } })
    expect(screen.getByLabelText('Auxiliary volume name: VOL-01')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it.each([
    ['Local', { ...existingStorageGroup, topology: 'local' as const, pushToOrchestrator: true }],
    ['Existing', { ...existingStorageGroup, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const, consistencyGroupId: '001', auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' }, pushToOrchestrator: true }],
  ])('keeps a pushed %s group read-only while its steps stay viewable', async (_label, initialData) => {
    const onCreate = vi.fn()
    const onCancel = vi.fn()
    const onDirtyChange = vi.fn()
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder initialData={initialData} onCreate={onCreate} onCancel={onCancel} onDirtyChange={onDirtyChange} />)
    expect(screen.getByText('This recovery group has been pushed to the orchestrator and is read-only. Roll it back before editing.')).toBeInTheDocument()
    expect(screen.getByLabelText('Group name *')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Group name *'), { target: { value: 'Changed' } })
    expect(screen.getByLabelText('Group name *')).toHaveValue('Storage group')
    expect(onDirtyChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByLabelText('Topology mode')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByLabelText('Group name *')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    expect(screen.getByRole('button', { name: 'Remove volume: VOL-01' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByRole('switch', { name: 'Deploy to orchestrator' })).toBeDisabled()
    const create = screen.getByRole('button', { name: 'Create Recovery Group' })
    expect(create).toBeDisabled()
    await user.click(create)
    expect(onCreate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('keeps a pushed Managed group read-only', async () => {
    const onCreate = vi.fn()
    const user = userEvent.setup()
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'managed', consistencyGroupId: '55', auxiliaryNamesByVolume: { 'VOL-01': 'aux_VOL-01' }, pushToOrchestrator: true }} onCreate={onCreate} onCancel={vi.fn()} />)
    expect(screen.getByText('This recovery group has been pushed to the orchestrator and is read-only. Roll it back before editing.')).toBeInTheDocument()
    expect(screen.getByLabelText('Group name *')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    expect(screen.getByLabelText('Metro Mirror configuration')).toBeDisabled()
    expect(screen.getByLabelText('Topology mode')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('does not show the pushed lock for a group that is not pushed', () => {
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, pushToOrchestrator: false }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText(/pushed to the orchestrator and is read-only/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Group name *')).toBeEnabled()
  })

  it('never silently converts an existing managed group', async () => {
    render(<RecoveryGroupBuilder initialData={{ ...existingStorageGroup, topology: 'metro_mirror', metroMirrorMode: 'managed', consistencyGroupId: '001' }} onCreate={vi.fn()} onCancel={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Storage topology' }))
    expect(screen.getByLabelText('Topology mode')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Orchestration' })).toBeDisabled()
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
    isResolved: true,
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
    isResolved: true,
    })
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={{ ...existingGroup, relatedVolumeProviderId: 'ibm-flashsystem-01' }}
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

  it('discovers related storage on the FlashSystem the user selects', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupBuilder
        initialData={existingGroup}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
    await user.click(screen.getByRole('button', { name: 'Related storage' }))

    expect(vi.mocked(useRecoveryGroupRelatedVolumes)).toHaveBeenLastCalledWith(
      existingGroup.providerId,
      existingGroup.resources,
      'ibm-flashsystem-01',
      true,
    )
  })

  it('lets the user add FlashSystem volumes beyond what was auto-discovered', async () => {
    vi.mocked(useRecoveryGroupRelatedVolumes).mockReturnValue({
      flashcopyProviderId: 'ibm-flashsystem-01',
      discoveredVolumeNames: [],
      isLoading: false,
    isResolved: true,
    })
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <RecoveryGroupBuilder
        initialData={{ ...existingGroup, relatedVolumeProviderId: 'ibm-flashsystem-01' }}
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

  it('keeps a FlashSystem volume group on the seven-step flow', async () => {
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
    isResolved: true,
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
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await user.click(screen.getByRole('button', { name: 'Policy Set' }))
    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    await completeOrchestrationAndCreate(user)

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      relatedVolumeProviderId: 'ibm-flashsystem-01',
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
    await user.click(screen.getByRole('tab', { name: 'Storage volumes' }))
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
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'local')
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
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
    await user.click(screen.getByRole('button', { name: 'Storage topology' }))
    await user.selectOptions(screen.getByLabelText('Topology mode'), 'local')
    await user.selectOptions(screen.getByLabelText('Source FlashSystem provider'), 'ibm-flashsystem-01')
    await user.click(screen.getByRole('button', { name: 'Resource type' }))
    await user.click(screen.getByRole('button', { name: /VMware virtual machines/i }))
    await user.click(screen.getByRole('button', { name: 'Provider' }))

    expect(screen.getByRole('button', { name: /Production vCenter/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recovery vCenter/i })).not.toBeInTheDocument()
  })
})
