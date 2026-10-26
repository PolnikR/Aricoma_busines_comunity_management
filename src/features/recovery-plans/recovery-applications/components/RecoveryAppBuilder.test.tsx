import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { RecoveryAppBuilder } from './RecoveryAppBuilder'
import type { RecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import type { LockedProviders, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const platformProvidersQuery = vi.hoisted(() => ({
  current: {
    data: [
      { id: 'airflow-01', name: 'Primary Airflow', type: 'AIRFLOW', credentialStatus: 'ok' },
      { id: 'airflow-no-creds', name: 'Unavailable Airflow', type: 'AIRFLOW', credentialStatus: 'missing' },
      { id: 'keycloak-01', name: 'Aricoma Keycloak', type: 'KEYCLOAK', credentialStatus: 'ok' },
      { id: 'smtp-01', name: 'Primary SMTP', type: 'SMTP', credentialStatus: 'ok' },
      { id: 'backend-01', name: 'ABCO Backend', type: 'BACKEND', credentialStatus: 'ok' },
    ],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
const policySetsQuery = vi.hoisted(() => ({
  current: {
    data: [{
      id: 'critical-daily-latest',
      name: 'Critical - Daily DR Test',
      description: 'Daily recovery test',
      snapshot_policy_id: 'daily-latest',
      recovery_app_policy_id: 'critical-daily-latest',
      clean_room_policy_id: 'enforce-clean-target',
    }],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
const providersQuery = vi.hoisted(() => ({
  current: {
    data: [{
      id: 'vmware-01',
      name: 'Production vCenter',
      description: 'VMware provider',
      type: 'VMWARE',
      ipAddress: '10.0.0.10',
      credentialId: 'vmware-cred',
      credentialStatus: 'ok',
    }, {
      id: 'power-01',
      name: 'Lab HMC',
      description: 'IBM Power provider',
      type: 'IBM_POWER',
      role: 'source',
      ipAddress: '10.0.0.30',
      credentialId: 'power-cred',
      credentialStatus: 'ok',
    }, {
      id: 'vmware-target-01',
      name: 'DR vCenter',
      description: 'VMware target provider',
      type: 'VMWARE',
      role: 'target',
      ipAddress: '10.0.0.20',
      credentialId: 'vmware-cred',
      credentialStatus: 'ok',
    }] as ProviderRecord[] | undefined,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
const recoveryGroupsQuery = vi.hoisted(() => ({
  current: {
    groups: [{
      id: 'database_group',
      name: 'Database Group',
      description: 'Database recovery group',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
      resourceCount: 2,
      status: 'Active',
      pushToOrchestrator: true,
      airflowRunId: 'run-1',
    }] as RecoveryGroup[],
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
    refresh: vi.fn(),
  },
}))

vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => platformProvidersQuery.current,
}))
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({
  useGetPolicySets: () => policySetsQuery.current,
}))
vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => providersQuery.current,
}))
vi.mock('../../recovery-groups/hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: () => recoveryGroupsQuery.current,
}))
vi.mock('@/generated/query/snapshot-policies/snapshot-policies.gen', () => ({
  useGetPolicies: () => ({ data: [], isLoading: false, error: null }),
}))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({
  useGetRecoveryAppPolicies: () => ({ data: [], isLoading: false, error: null }),
}))
vi.mock('@/generated/query/clean-room-policies/clean-room-policies.gen', () => ({
  useGetCleanRoomPolicies: () => ({ data: [], isLoading: false, error: null }),
}))
const canvasMode = vi.hoisted(() => ({ real: false }))
const callbackHarness = vi.hoisted(() => ({
  metadata: null as React.ComponentProps<typeof import('./AppMetadataForm').AppMetadataForm> | null,
  canvas: null as React.ComponentProps<typeof import('./TierCanvas').TierCanvas> | null,
}))
vi.mock('./AppMetadataForm', async (importOriginal) => {
  const { AppMetadataForm } = await importOriginal<typeof import('./AppMetadataForm')>()
  return { AppMetadataForm: (props: React.ComponentProps<typeof AppMetadataForm>) => {
    callbackHarness.metadata = props
    return <AppMetadataForm {...props} />
  } }
})
vi.mock('./TierCanvas', async (importOriginal) => {
  const { TierCanvas: ActualTierCanvas } = await importOriginal<typeof import('./TierCanvas')>()
  return {
  TierCanvas: (props: React.ComponentProps<typeof ActualTierCanvas>) => {
    callbackHarness.canvas = props
    const {
    tiers,
    recoveryGroupVmOptions,
    onRecoveryGroupAdded,
    onRecoveryGroupRemoved,
    onRecoveryVmSelectionChange,
    ...tierActions
    } = props
    return canvasMode.real ? (
    <ActualTierCanvas
      {...tierActions}
      tiers={tiers}
      {...(recoveryGroupVmOptions ? { recoveryGroupVmOptions } : {})}
      {...(onRecoveryGroupAdded ? { onRecoveryGroupAdded } : {})}
      {...(onRecoveryGroupRemoved ? { onRecoveryGroupRemoved } : {})}
      {...(onRecoveryVmSelectionChange ? { onRecoveryVmSelectionChange } : {})}
    />
  ) : (
    <div>
      <span>Tier count: {Object.keys(tiers).length}</span>
      <span>Database VMs: {tiers['tier_id']?.recovery_group?.vms.length ?? 0}</span>
      <span>Group id: {tiers['tier_id']?.recovery_group?.id ?? 'none'}</span>
      <span>Group name: {tiers['tier_id']?.recovery_group?.name ?? 'none'}</span>
      <span>Database options: {recoveryGroupVmOptions?.['database_group']?.length ?? 0}</span>
      <span>Group options: {Object.keys(recoveryGroupVmOptions ?? {}).join(',') || 'none'}</span>
      <button type="button" onClick={() => { onRecoveryGroupAdded?.('tier_id', 'database_group') }}>
        Add test group
      </button>
      <button type="button" onClick={() => { onRecoveryGroupRemoved?.('tier_id') }}>
        Remove test group
      </button>
      <button type="button" onClick={() => { onRecoveryVmSelectionChange?.('tier_id', 'DB-01', false) }}>
        Exclude DB-01
      </button>
      <button
        type="button"
        onClick={() => { Object.keys(tiers).forEach(tierId => { onRecoveryGroupAdded?.(tierId, 'database_group') }) }}
      >
        Assign all tiers
      </button>
    </div>
  )
  },
  }
})

function fixtureValue<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected fixture value')
  return value
}

function draftFixture(): RecoveryApplicationFormState {
  return {
    fileName: 'finance_recovery', name: 'Finance', description: 'Finance recovery', environment: 'prod',
    platform: 'vmware-01', targetProviderId: 'vmware-target-01', policySetId: 'critical-daily-latest',
    pushToOrchestrator: false, orchestrationProviderId: '', notificationEmail: null,
    tiers: new Map([
      ['tier_id', { order: 3, description: 'Database tier', recovery_group: { id: 'database_group', name: 'Database Group', vms: [{ name: 'DB-01', order: 8, hostname: 'stored-host' }] } }],
      ['web', { order: 1, description: 'Web tier', recovery_group: { id: 'database_group', name: 'Database Group', vms: [{ name: 'DB-02', order: 1 }] } }],
    ]),
  }
}

function metadataProps() {
  if (!callbackHarness.metadata) throw new Error('Expected mounted metadata form')
  return callbackHarness.metadata
}

function canvasProps() {
  if (!callbackHarness.canvas) throw new Error('Expected mounted tier canvas')
  return callbackHarness.canvas
}

function fillDetails(sourceId = 'vmware-01', targetId = 'vmware-target-01') {
  fireEvent.change(screen.getByLabelText('ID *'), { target: { value: 'finance_recovery' } })
  fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
  fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
  fireEvent.change(screen.getByLabelText('Provider ID *'), { target: { value: sourceId } })
  fireEvent.change(screen.getByLabelText('Target provider ID *'), { target: { value: targetId } })
}

async function openTiers(sourceId?: string, targetId?: string) {
  fillDetails(sourceId, targetId)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
}

async function openPolicy() {
  await openTiers()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Assign all tiers' }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RecoveryAppBuilder', () => {
  beforeEach(() => {
    callbackHarness.metadata = null
    callbackHarness.canvas = null
    canvasMode.real = false
    recoveryGroupsQuery.current.groups = [{
      id: 'database_group',
      name: 'Database Group',
      description: 'Database recovery group',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
      resourceCount: 2,
      status: 'Active',
      pushToOrchestrator: true,
      airflowRunId: 'run-1',
    }, {
      id: 'lpar_group',
      name: 'LPAR Group',
      description: 'AIX recovery group',
      sourceCategory: 'backup_system_workload',
      workloadType: 'ibm_power_virtual_machines',
      resourceType: 'vm',
      resources: ['aix2source'],
      resourceCount: 1,
      status: 'Active',
      pushToOrchestrator: true,
      airflowRunId: 'run-1',
    }, {
      id: 'unresolved_group',
      name: 'Unresolved Group',
      description: 'Provider no longer exists',
      sourceCategory: 'backup_system_workload',
      workloadType: null,
      resourceType: 'vm',
      resources: ['ghost-01'],
      resourceCount: 1,
      status: 'Active',
      pushToOrchestrator: true,
      airflowRunId: 'run-1',
    }] as RecoveryGroup[]
    recoveryGroupsQuery.current.isLoading = false
    recoveryGroupsQuery.current.isFetching = false
    recoveryGroupsQuery.current.error = null
    recoveryGroupsQuery.current.refresh.mockReset()
    platformProvidersQuery.current.isLoading = false
    platformProvidersQuery.current.error = null
    platformProvidersQuery.current.refetch.mockReset()
    policySetsQuery.current.isLoading = false
    policySetsQuery.current.error = null
    policySetsQuery.current.refetch.mockReset()
    providersQuery.current.isLoading = false
    providersQuery.current.error = null
    providersQuery.current.refetch.mockReset()
  })

  it('renders the four-step wizard and keeps later steps disabled until details are valid', () => {
    render(<RecoveryAppBuilder />)
    expect(screen.getByRole('list', { name: 'Recovery application creation steps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Application details' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Policy set' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Orchestration' })).toBeDisabled()
  })

  describe('draft Group, VM and tier callback transitions', () => {
    const vmMetadata = { order: 8, hostname: 'db.example.test', ip_address: '192.0.2.10', os: 'Linux', cpu: 8, memory_gb: 32, storage_gb: 200 }

    async function saveFromWizard() {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
    }

    it.each(['missing_group', 'lpar_group', 'unresolved_group', 'unpublished_group'])('rejects %s assignment without dirty, but eligible assignment to an absent tier notifies dirty', async groupId => {
      recoveryGroupsQuery.current.groups.push({ ...fixtureValue(recoveryGroupsQuery.current.groups[0]), id: 'unpublished_group', pushToOrchestrator: false })
      const initialData = draftFixture()
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} onDirtyChange={onDirtyChange} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onRecoveryGroupAdded?.('tier_id', groupId) })
      expect(onDirtyChange).not.toHaveBeenCalled()
      expect(Object.entries(canvasProps().tiers)).toEqual([...before.tiers])
      act(() => { canvasProps().onRecoveryGroupAdded?.('absent', 'database_group') })
      expect(onDirtyChange.mock.calls).toEqual([[true]])
      await saveFromWizard()
      expect(onSave).toHaveBeenCalledExactlyOnceWith(before)
      expect(initialData).toEqual(before)
    })

    it.each([
      ['VMware', 'vmware-01', 'vmware-target-01', 'database_group', 'DB-01', 'DB-02'],
      ['IBM Power', 'power-01', 'power-01', 'lpar_group', 'aix01', 'aix02'],
    ])('copies every %s VM field with assignment precedence, then reindexes selection and preserves survivor metadata', async (_label, platform, targetProviderId, groupId, firstName, secondName) => {
      recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => group.id === groupId ? {
        ...group, resources: [firstName, secondName], vmMetadataByName: { [firstName]: { ...vmMetadata }, [secondName]: { hostname: 'second-original', cpu: 2 } },
      } : group)
      const queryBefore = structuredClone(recoveryGroupsQuery.current.groups)
      const initialData = { ...draftFixture(), platform, targetProviderId, tiers: new Map([['tier_id', { order: 3, description: 'Database tier' }]]) }
      const before = structuredClone(initialData)
      const onSave = vi.fn()
      const onDirtyChange = vi.fn()
      const props = { initialData, onSave, onDirtyChange }
      const { rerender } = render(<RecoveryAppBuilder {...props} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onRecoveryGroupAdded?.('tier_id', groupId) })
      const assigned = {
        id: groupId, name: _label === 'VMware' ? 'Database Group' : 'LPAR Group', description: _label === 'VMware' ? 'Database recovery group' : 'AIX recovery group',
        vms: [{ name: firstName, ...vmMetadata }, { name: secondName, order: 2, hostname: 'second-original', cpu: 2 }],
      }
      expect(canvasProps().tiers['tier_id']).toEqual({ order: 3, description: 'Database tier', recovery_group: assigned })
      expect(recoveryGroupsQuery.current.groups).toEqual(queryBefore)
      await saveFromWizard()
      expect(onSave).toHaveBeenNthCalledWith(1, { ...initialData, tiers: new Map([['tier_id', { order: 3, description: 'Database tier', recovery_group: assigned }]]) })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', firstName, true) })
      expect(canvasProps().tiers['tier_id']?.recovery_group).toEqual(assigned)
      recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => group.id === groupId ? {
        ...group, pushToOrchestrator: false, vmMetadataByName: { [firstName]: { hostname: 'fresh-host', cpu: 16 }, [secondName]: { hostname: 'query-changed', cpu: 99 } },
      } : group)
      const refreshedQuery = structuredClone(recoveryGroupsQuery.current.groups)
      rerender(<RecoveryAppBuilder {...props} />)
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', firstName, false) })
      expect(canvasProps().tiers['tier_id']?.recovery_group?.vms).toEqual([{ name: secondName, order: 1, hostname: 'second-original', cpu: 2 }])
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', firstName, true) })
      const expectedTier = { order: 3, description: 'Database tier', recovery_group: { ...assigned, vms: [
        { name: secondName, order: 1, hostname: 'second-original', cpu: 2 }, { name: firstName, order: 2, hostname: 'fresh-host', cpu: 16 },
      ] } }
      expect(canvasProps().tiers['tier_id']).toEqual(expectedTier)
      expect(onDirtyChange.mock.calls).toEqual([[true], [true], [true], [true]])
      expect(recoveryGroupsQuery.current.groups).toEqual(refreshedQuery)
      recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => ({ ...group, pushToOrchestrator: true }))
      rerender(<RecoveryAppBuilder {...props} />)
      await saveFromWizard()
      expect(onSave).toHaveBeenCalledTimes(2)
      expect(onSave).toHaveBeenNthCalledWith(2, { ...initialData, tiers: new Map([['tier_id', expectedTier]]) })
      expect(initialData).toEqual(before)
      expect([...initialData.tiers]).toEqual([...before.tiers])
    })

    it('allows unknown VM names and missing live Group data, retaining selection order and callback dirty no-ops', async () => {
      const initialData = draftFixture()
      initialData.tiers.set('empty', { order: 7, description: 'No Group' })
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      const props = { initialData, onDirtyChange }
      const { rerender } = render(<RecoveryAppBuilder {...props} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', 'unknown', true) })
      recoveryGroupsQuery.current.groups = []
      rerender(<RecoveryAppBuilder {...props} />)
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', 'missing-group-vm', true) })
      const expected = [
        { name: 'DB-01', order: 1, hostname: 'stored-host' }, { name: 'unknown', order: 2 }, { name: 'missing-group-vm', order: 3 },
      ]
      expect(canvasProps().tiers['tier_id']?.recovery_group?.vms).toEqual(expected)
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', 'unknown', true) })
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('tier_id', 'absent', false) })
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('absent', 'DB-01', true) })
      act(() => { canvasProps().onRecoveryVmSelectionChange?.('empty', 'DB-01', true) })
      expect(canvasProps().tiers['tier_id']?.recovery_group?.vms).toEqual(expected)
      expect(canvasProps().tiers['empty']).toEqual({ order: 7, description: 'No Group' })
      expect(onDirtyChange.mock.calls).toEqual(Array.from({ length: 6 }, () => [true]))
      expect(initialData).toEqual(before)
    })

    it('removes only Group content, retaining Map position, tier order and description even for missing-removal callbacks', async () => {
      const initialData = draftFixture()
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onRecoveryGroupRemoved?.('tier_id') })
      act(() => { canvasProps().onRecoveryGroupRemoved?.('tier_id') })
      act(() => { canvasProps().onRecoveryGroupRemoved?.('absent') })
      expect(Object.entries(canvasProps().tiers)).toEqual([
        ['tier_id', { order: 3, description: 'Database tier' }], ['web', before.tiers.get('web')],
      ])
      expect(onDirtyChange.mock.calls).toEqual([[true], [true], [true]])
      expect(initialData).toEqual(before)
    })

    it('edits, renames, adds, deletes and applies reorder records without sorting Map insertion or losing metadata', async () => {
      const initialData = draftFixture()
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} onSave={onSave} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      act(() => { canvasProps().onTierEdit?.('tier_id', 'renamed', { tierDescription: 'Edited database' }) })
      expect(Object.keys(canvasProps().tiers)).toEqual(['web', 'renamed'])
      const renamed = { ...fixtureValue(before.tiers.get('tier_id')), description: 'Edited database' }
      expect(canvasProps().tiers['renamed']).toEqual(renamed)
      act(() => { canvasProps().onTierEdit?.('renamed', 'renamed', { tierDescription: 'Edited again' }) })
      const updated = { ...renamed, description: 'Edited again' }
      const added = { ...fixtureValue(before.tiers.get('web')), order: 4, description: 'Added tier' }
      act(() => { canvasProps().onTierAdd?.('added', added) })
      act(() => { canvasProps().onTierDelete?.('web') })
      expect(Object.entries(canvasProps().tiers)).toEqual([['renamed', updated], ['added', added]])
      const reordered = { added: { ...added, order: 2 }, renamed: { ...updated, order: 1 } }
      const reorderBefore = structuredClone(reordered)
      act(() => { canvasProps().onTierReorder?.(reordered) })
      expect(Object.entries(canvasProps().tiers)).toEqual([['added', reordered.added], ['renamed', reordered.renamed]])
      act(() => { canvasProps().onTierEdit?.('absent', 'ignored', { tierDescription: 'Ignored' }) })
      act(() => { canvasProps().onTierDelete?.('absent') })
      expect(onDirtyChange.mock.calls).toEqual(Array.from({ length: 7 }, () => [true]))
      await saveFromWizard()
      expect(onSave).toHaveBeenCalledExactlyOnceWith({ ...initialData, tiers: new Map(Object.entries(reordered)) })
      expect(reordered).toEqual(reorderBefore)
      expect(added).toEqual({ ...fixtureValue(before.tiers.get('web')), order: 4, description: 'Added tier' })
      expect(initialData).toEqual(before)
      expect([...initialData.tiers]).toEqual([...before.tiers])
    })

    it('keeps last-tier deletion and normalized collision checks in the UI while direct callbacks retain their preconditions', async () => {
      canvasMode.real = true
      const initialData = draftFixture()
      initialData.tiers.delete('web')
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
      await userEvent.setup().click(screen.getByRole('button', { name: '+' }))
      fireEvent.change(screen.getByPlaceholderText('tier_id'), { target: { value: 'Tíer ID' } })
      fireEvent.change(screen.getByPlaceholderText('Tier description'), { target: { value: ' New tier ' } })
      expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
      expect(onDirtyChange).not.toHaveBeenCalled()
      fireEvent.change(screen.getByPlaceholderText('tier_id'), { target: { value: 'Néw Tier' } })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Create' }))
      expect(canvasProps().tiers['new_tier']).toEqual({ order: 4, description: 'New tier' })
      act(() => { canvasProps().onTierDelete?.('new_tier') })
      act(() => { canvasProps().onTierDelete?.('tier_id') })
      expect(canvasProps().tiers).toEqual({})
      act(() => { canvasProps().onTierAdd?.('Unnormalized ID', { order: 12, description: ' Direct ' }) })
      expect(canvasProps().tiers).toEqual({ 'Unnormalized ID': { order: 12, description: ' Direct ' } })
      expect(onDirtyChange.mock.calls).toEqual([[true], [true], [true], [true]])
      expect(initialData).toEqual(before)
    })
  })

  describe('readiness and final validation boundaries', () => {
    const lockedProviders = { platform: 'VMWARE', sourceProviderId: 'vmware-01', targetProviderId: 'vmware-target-01' }

    it.each([
      ['invalid file ID', { fileName: 'bad id' }, false],
      ['invalid application name', { name: '' }, false],
      ['blank description', { description: '   ' }, false],
      ['unknown source', { platform: 'gone' }, false],
      ['incompatible target', { targetProviderId: 'power-01' }, false],
      ['valid details', {}, true],
    ] as const)('gates step 1 and every later header on %s', (_label, patch, ready) => {
      render(<RecoveryAppBuilder initialData={{ ...draftFixture(), ...patch }} />)
      for (const name of ['Next', 'Recovery groups & tiers', 'Policy set', 'Orchestration']) {
        expect(screen.getByRole('button', { name })).toHaveProperty('disabled', !(ready))
      }
    })

    it.each([
      ['zero tiers', 'empty', 'critical-daily-latest', false, true],
      ['unassigned tier', 'unassigned', 'critical-daily-latest', false, true],
      ['blank policy', 'assigned', '   ', true, false],
      ['policy absent from query', 'assigned', 'stale-policy', true, true],
    ] as const)('gates steps 2-4 independently: %s', async (_label, membership, policySetId, tiersReady, policyReady) => {
      const initialData = { ...draftFixture(), policySetId }
      if (membership === 'empty') initialData.tiers.clear()
      if (membership === 'unassigned') initialData.tiers.set('tier_id', { order: 3, description: 'No Group' })
      render(<RecoveryAppBuilder initialData={initialData} />)
      expect(screen.getByRole('button', { name: 'Policy set' })).toHaveProperty('disabled', !(tiersReady))
      expect(screen.getByRole('button', { name: 'Orchestration' })).toHaveProperty('disabled', !(tiersReady && policyReady))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', !(tiersReady))
      if (!tiersReady) return
      await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', !(policyReady))
      if (!policyReady) return
      await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled()
    })

    it('disables Save for zero tiers even though final validation accepts zero tiers', async () => {
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={draftFixture()} onSave={onSave} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      act(() => { canvasProps().onTierDelete?.('tier_id') })
      act(() => { canvasProps().onTierDelete?.('web') })
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).not.toHaveBeenCalled()
    })

    it.each([
      ['initial loading without data', 'absent', true, false, false],
      ['error without data', 'absent', false, true, false],
      ['loaded empty data', 'empty', false, false, false],
      ['cached data with error', 'cached', false, true, false],
      ['cached data while loading', 'cached', true, false, true],
      ['loaded cached data', 'cached', false, false, true],
    ] as const)('projects locked provider readiness: %s', async (_label, data, isLoading, error, ready) => {
      const previous = providersQuery.current.data
      onTestFinished(() => { providersQuery.current.data = previous })
      providersQuery.current.data = data === 'absent' ? undefined : data === 'empty' ? [] : previous
      providersQuery.current.isLoading = isLoading
      providersQuery.current.error = error ? new Error('Provider query failed') : null
      const onSave = vi.fn()
      const initialData = draftFixture()
      render(<RecoveryAppBuilder initialData={initialData} lockedProviders={lockedProviders} onSave={onSave} />)
      expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
      expect(screen.queryByText('no longer exists', { exact: false }) !== null).toBe(data === 'empty' && !error)
      if (error) expect(screen.getAllByRole('button', { name: 'Retry' }).length).toBeGreaterThan(0)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toHaveProperty('disabled', !(ready))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledTimes(ready ? 1 : 0)
      if (ready) expect(onSave).toHaveBeenCalledWith(initialData)
    })

    it.each([false, true])('requires credentials for Create but only stored identity/type/role for locked Edit (locked=%s)', async locked => {
      const previous = fixtureValue(providersQuery.current.data)
      onTestFinished(() => { providersQuery.current.data = previous })
      providersQuery.current.data = previous.map(provider => ({ ...provider, credentialStatus: 'missing' }))
      const initialData = draftFixture()
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} lockedProviders={locked ? lockedProviders : null} />)
      expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', !(locked))
      if (!locked) return
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledExactlyOnceWith(initialData)
    })

    it.each([
      ['Groups loading', true, false, false, false, false],
      ['Groups background fetching', false, true, false, false, true],
      ['cached Group error', false, false, true, false, true],
      ['cached policy and orchestration errors/loading', false, false, false, true, true],
    ] as const)('preserves cached-data Save flags: %s', async (_label, loading, fetching, groupError, auxiliaryErrors, ready) => {
      recoveryGroupsQuery.current.isLoading = loading
      recoveryGroupsQuery.current.isFetching = fetching
      recoveryGroupsQuery.current.error = groupError ? new Error('Group refresh failed') : null
      policySetsQuery.current.isLoading = auxiliaryErrors
      policySetsQuery.current.error = auxiliaryErrors ? new Error('Policy refresh failed') : null
      platformProvidersQuery.current.isLoading = auxiliaryErrors
      platformProvidersQuery.current.error = auxiliaryErrors ? new Error('Airflow refresh failed') : null
      const initialData = { ...draftFixture(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' }
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toHaveProperty('disabled', !(ready))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledTimes(ready ? 1 : 0)
      if (ready) expect(onSave).toHaveBeenCalledWith(initialData)
    })

    it.each(['missing', 'incompatible', 'unpublished'] as const)('preliminary Save permits an assigned %s Group but final validation rejects it', async state => {
      recoveryGroupsQuery.current.groups = state === 'missing' ? [] : recoveryGroupsQuery.current.groups.map(group => group.id === 'database_group' && group.sourceCategory === 'backup_system_workload' ? {
        ...group, ...(state === 'incompatible' ? { workloadType: 'ibm_power_virtual_machines' } : { pushToOrchestrator: false }),
      } : group)
      const initialData = draftFixture()
      const before = structuredClone(initialData)
      const onSave = vi.fn()
      const alert = vi.fn()
      vi.stubGlobal('alert', alert)
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('"Database Group" in tier "tier_id"'))
      expect(initialData).toEqual(before)
    })
  })

  it('keeps the next step disabled until a target provider is selected', () => {
    render(<RecoveryAppBuilder />)
    fillDetails()
    fireEvent.change(screen.getByLabelText('Target provider ID *'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toBeDisabled()
  })

  it.each([
    [false, 'run-1'], [true, null], [true, ''], [true, '   '], [undefined, 'run-1'],
  ] as const)('excludes unpublished groups and rejects direct assignment (%s, %s)', async (pushToOrchestrator, airflowRunId) => {
    recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => ({ ...group, pushToOrchestrator, airflowRunId }))
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByText('No VMware recovery groups are available')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add test group' }))
    expect(screen.getByText('Group id: none')).toBeInTheDocument()
  })

  it('offers only VMware recovery groups for a VMware source', async () => {
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByText('Group options: database_group')).toBeInTheDocument()
  })

  it('offers only IBM Power recovery groups for an IBM Power source, using one provider on both sides', async () => {
    render(<RecoveryAppBuilder />)
    await openTiers('power-01', 'power-01')
    expect(screen.getByText('Group options: lpar_group')).toBeInTheDocument()
  })

  it('keeps locked providers of a saved application and offers groups of its stored platform', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppBuilder lockedProviders={{ platform: 'ibm_power', sourceProviderId: 'power-gone', targetProviderId: 'power-gone' }} />)
    fireEvent.change(screen.getByLabelText('ID *'), { target: { value: 'finance_recovery' } })
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })

    expect(screen.getByLabelText('Provider ID *')).toBeDisabled()
    expect(screen.getByLabelText('Target provider ID *')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Group options: lpar_group')).toBeInTheDocument()
  })

  describe('validating stored recovery groups before saving', () => {
    function savedApplication(platform: string, targetProviderId: string, groupId: string, groupName: string, vmNames: string[]): RecoveryApplicationFormState {
      return {
        fileName: 'finance_recovery',
        policySetId: 'critical-daily-latest',
        pushToOrchestrator: false,
        name: 'Finance',
        description: 'Finance recovery',
        environment: 'prod',
        platform,
        orchestrationProviderId: '',
        targetProviderId,
        notificationEmail: null,
        tiers: new Map([['tier_id', {
          order: 1,
          description: 'Tier',
          recovery_group: { id: groupId, name: groupName, vms: vmNames.map(name => ({ name })) },
        }]]),
      }
    }

    async function trySave(initialData: RecoveryApplicationFormState, lockedProviders?: LockedProviders) {
      const user = userEvent.setup()
      const onSave = vi.fn()
      const alert = vi.fn()
      vi.stubGlobal('alert', alert)
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} lockedProviders={lockedProviders ?? null} />)
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      await user.click(screen.getByRole('button', { name: 'Save Application' }))
      return { onSave, alert }
    }

    it('rejects in-flight tier reorder and resource drops while saving', async () => {
      canvasMode.real = true
      const user = userEvent.setup()
      const initialData = savedApplication('vmware-01', 'vmware-target-01', 'database_group', 'Database Group', ['DB-01'])
      initialData.tiers.set('second', { ...structuredClone(initialData.tiers.get('tier_id')), order: 2, description: 'Second tier' })
      const onSave = vi.fn<(state: RecoveryApplicationFormState) => void>()
      const onDirtyChange = vi.fn()
      const props = { initialData, onSave, onDirtyChange }
      const { rerender } = render(<RecoveryAppBuilder {...props} />)
      await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      const first = screen.getByText('tier_id').closest('[draggable]')
      const second = screen.getByText('second').closest('[draggable]')
      const dropTarget = screen.getAllByRole('group', { name: 'Database Group virtual machines' })[0]?.closest('section')
      if (!first || !second || !dropTarget) throw new Error('Expected real tier drag/drop targets')
      fireEvent.dragStart(first)
      rerender(<RecoveryAppBuilder {...props} isSaving />)
      fireEvent.drop(second)
      fireEvent.drop(dropTarget, { dataTransfer: { getData: () => 'database_group' } })
      const checkbox = screen.getAllByRole('checkbox', { name: 'DB-01' })[0]
      if (!checkbox) throw new Error('Expected VM checkbox')
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
      expect(onDirtyChange).not.toHaveBeenCalled()
      rerender(<RecoveryAppBuilder {...props} isSaving={false} />)
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      await user.click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledWith(initialData)
    })

    it('locks a source-change confirmation that was open when Save began', async () => {
      const user = userEvent.setup()
      const initialData = savedApplication('vmware-01', 'vmware-target-01', 'database_group', 'Database Group', ['DB-01'])
      const onDirtyChange = vi.fn()
      const { rerender } = render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      await user.selectOptions(screen.getByLabelText('Provider ID *'), 'power-01')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      rerender(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} isSaving />)
      for (const button of within(screen.getByRole('dialog')).getAllByRole('button')) expect(button).toBeDisabled()
      await user.keyboard('{Enter}')
      expect(onDirtyChange).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Provider ID *')).toHaveValue('vmware-01')
    })

    it.each([
      ['vmware-01', 'vmware-target-01', 'database_group', 'Database Group', 'DB-01'],
      ['power-01', 'power-01', 'lpar_group', 'LPAR Group', 'aix2source'],
    ])('preserves stored configuration across rollback and republish for %s', async (source, target, groupId, groupName, vmName) => {
      canvasMode.real = true
      const initialData = savedApplication(source, target, groupId, groupName, [vmName])
      initialData.tiers.set('tier_id', {
        order: 1, description: 'Custom tier',
        recovery_group: { id: groupId, name: groupName, vms: [{ name: vmName, order: 1, hostname: 'custom-host', cpu: 8 }] },
      })
      const before = structuredClone(initialData)
      const onSave = vi.fn()
      const alert = vi.fn()
      vi.stubGlobal('alert', alert)
      const props = { initialData, onSave, lockedProviders: { platform: source === 'power-01' ? 'IBM_POWER' : 'VMWARE', sourceProviderId: source, targetProviderId: target } }
      const { rerender } = render(<RecoveryAppBuilder {...props} />)
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => ({ ...group, pushToOrchestrator: false }))
      rerender(<RecoveryAppBuilder {...props} />)
      expect(screen.getByText(vmName)).toBeInTheDocument()
      expect(screen.getByText('Recovery group: ' + groupName)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      await user.click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('"' + groupName + '" in tier "tier_id"'))
      expect(initialData).toEqual(before)
      recoveryGroupsQuery.current.groups = recoveryGroupsQuery.current.groups.map(group => ({ ...group, pushToOrchestrator: true }))
      rerender(<RecoveryAppBuilder {...props} />)
      await user.click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledWith(before)
    })

    it('blocks saving a VMware application with an IBM Power recovery group', async () => {
      const { onSave, alert } = await trySave(savedApplication('vmware-01', 'vmware-target-01', 'lpar_group', 'LPAR Group', ['aix2source']))
      expect(onSave).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledWith('Recovery group "LPAR Group" in tier "tier_id" does not match the application platform. Remove it from the tier.')
    })

    it('blocks saving an IBM Power application with an invalid LPAR name', async () => {
      const { onSave, alert } = await trySave(savedApplication('power-01', 'power-01', 'lpar_group', 'LPAR Group', ['bad name']))
      expect(onSave).not.toHaveBeenCalled()
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('LPAR name "bad name" in tier "tier_id" is invalid'))
    })

    it('saves an IBM Power application using one provider as source and target', async () => {
      const { onSave, alert } = await trySave(savedApplication('power-01', 'power-01', 'lpar_group', 'LPAR Group', ['aix2source']))
      expect(alert).not.toHaveBeenCalled()
      expect(onSave.mock.calls[0]?.[0]).toMatchObject({ platform: 'power-01', targetProviderId: 'power-01' })
    })

    it("keeps a new application's source and target editable", () => {
      render(<RecoveryAppBuilder />)
      expect(screen.getByLabelText('Provider ID *')).toBeEnabled()
      fillDetails()
      expect(screen.getByLabelText('Target provider ID *')).toBeEnabled()
    })

    it.each([
      ['source', { sourceProviderId: null, targetProviderId: 'vmware-target-01' }],
      ['target', { sourceProviderId: 'vmware-01', targetProviderId: null }],
      ['source and target', { sourceProviderId: null, targetProviderId: null }],
    ])('locks a legacy application without a stored %s provider id and blocks saving', async (_label, ids) => {
      const user = userEvent.setup()
      const legacy = savedApplication(ids.sourceProviderId ?? '', ids.targetProviderId ?? '', 'database_group', 'Database Group', ['DB-01'])
      render(<RecoveryAppBuilder initialData={legacy} lockedProviders={{ platform: 'VMWARE', ...ids }} />)

      expect(screen.getByLabelText('Provider ID *')).toBeDisabled()
      expect(screen.getByLabelText('Target provider ID *')).toBeDisabled()
      expect(screen.getByText(/uses the old recovery application contract/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    })

    it.each([
      ['source', { sourceProviderId: 'vmware-gone', targetProviderId: 'vmware-target-01' }, 'Source provider "vmware-gone" no longer exists'],
      ['target', { sourceProviderId: 'vmware-01', targetProviderId: 'vmware-target-gone' }, 'Target provider "vmware-target-gone" no longer exists'],
    ])('names a stored %s provider that is gone, keeps it locked and blocks saving until it is back', async (_label, ids, message) => {
      const user = userEvent.setup()
      const saved = savedApplication(ids.sourceProviderId, ids.targetProviderId, 'database_group', 'Database Group', ['DB-01'])
      const { rerender } = render(<RecoveryAppBuilder initialData={saved} lockedProviders={{ platform: 'VMWARE', ...ids }} />)

      expect(screen.getByLabelText('Provider ID *')).toBeDisabled()
      expect(screen.getByText(message, { exact: false })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()

      const original = fixtureValue(providersQuery.current.data)
      onTestFinished(() => { providersQuery.current.data = original })
      providersQuery.current.data = original.map(provider => {
        if (provider.id === 'vmware-01') return { ...provider, id: ids.sourceProviderId }
        if (provider.id === 'vmware-target-01') return { ...provider, id: ids.targetProviderId }
        return provider
      })
      rerender(<RecoveryAppBuilder initialData={saved} lockedProviders={{ platform: 'VMWARE', ...ids }} />)
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled()
    })

    it('blocks saving a stored VMware target that is no longer role=target', async () => {
      const user = userEvent.setup()
      const saved = savedApplication('vmware-01', 'vmware-01', 'database_group', 'Database Group', ['DB-01'])
      render(<RecoveryAppBuilder initialData={saved} lockedProviders={{ platform: 'VMWARE', sourceProviderId: 'vmware-01', targetProviderId: 'vmware-01' }} />)

      expect(screen.getByText('Target provider "vmware-01" no longer fits', { exact: false })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    })

    it('offers a retry instead of a verdict when the providers fail to load', async () => {
      const user = userEvent.setup()
      providersQuery.current.error = new Error('Get providers request failed with status 503')
      const saved = savedApplication('vmware-01', 'vmware-target-01', 'database_group', 'Database Group', ['DB-01'])
      render(<RecoveryAppBuilder initialData={saved} lockedProviders={{ platform: 'VMWARE', sourceProviderId: 'vmware-01', targetProviderId: 'vmware-target-01' }} />)

      expect(screen.queryByText('no longer exists', { exact: false })).not.toBeInTheDocument()
      const [retry] = screen.getAllByRole('button', { name: 'Retry' })
      if (!retry) throw new Error('Expected a retry button')
      await user.click(retry)
      expect(providersQuery.current.refetch).toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    })

    it('saves an application whose stored providers still exist', async () => {
      const locked = { platform: 'VMWARE', sourceProviderId: 'vmware-01', targetProviderId: 'vmware-target-01' }
      const { onSave, alert } = await trySave(savedApplication('vmware-01', 'vmware-target-01', 'database_group', 'Database Group', ['DB-01']), locked)
      expect(alert).not.toHaveBeenCalled()
      expect(onSave).toHaveBeenCalledOnce()
    })

    it('waits for the recovery groups before saving', async () => {
      recoveryGroupsQuery.current.isLoading = true
      const user = userEvent.setup()
      render(<RecoveryAppBuilder initialData={savedApplication('vmware-01', 'vmware-target-01', 'database_group', 'Database Group', ['DB-01'])} />)
      await user.click(screen.getByRole('button', { name: 'Orchestration' }))
      expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    })
  })

  describe('changing the source provider of a new application', () => {
    it('applies combined same-source metadata and identical patches without confirmation, notifying dirty for each callback', () => {
      const initialData = draftFixture()
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      act(() => { metadataProps().onMetadataChange?.({ platform: 'vmware-01', name: 'Updated' }) })
      expect(metadataProps().initialValues).toMatchObject({ name: 'Updated', platform: 'vmware-01', targetProviderId: 'vmware-target-01' })
      act(() => { metadataProps().onMetadataChange?.({ platform: 'vmware-01', name: 'Updated' }) })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(onDirtyChange.mock.calls).toEqual([[true], [true]])
      expect(initialData).toEqual(before)
    })

    it('ignores a locked provider-only callback while still notifying dirty', async () => {
      const initialData = draftFixture()
      const onDirtyChange = vi.fn()
      const onSave = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onSave={onSave} onDirtyChange={onDirtyChange} lockedProviders={{ platform: 'VMWARE', sourceProviderId: 'vmware-01', targetProviderId: 'vmware-target-01' }} />)
      act(() => { metadataProps().onMetadataChange?.({ platform: 'power-01', targetProviderId: 'power-01' }) })
      expect(metadataProps().initialValues).toMatchObject({ platform: 'vmware-01', targetProviderId: 'vmware-target-01' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Save Application' }))
      expect(onSave).toHaveBeenCalledExactlyOnceWith(initialData)
      expect(onDirtyChange.mock.calls).toEqual([[true]])
    })

    it.each(['vmware-target-01', 'target-gone'])('defers a second VMware source, then detaches multiple tiers preserving IDs, descriptions, orders and target %s', async targetProviderId => {
      const previousProviders = fixtureValue(providersQuery.current.data)
      providersQuery.current.data = [...previousProviders, { ...fixtureValue(previousProviders[0]), id: 'vmware-02', name: 'Second vCenter' }]
      onTestFinished(() => { providersQuery.current.data = previousProviders })
      const initialData = { ...draftFixture(), targetProviderId }
      const before = structuredClone(initialData)
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      await userEvent.setup().selectOptions(screen.getByLabelText('Provider ID *'), 'vmware-02')
      expect(metadataProps().initialValues).toMatchObject({ platform: 'vmware-01', targetProviderId })
      expect(onDirtyChange).not.toHaveBeenCalled()
      await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change provider' }))
      expect(metadataProps().initialValues).toMatchObject({ platform: 'vmware-02', targetProviderId })
      expect(onDirtyChange.mock.calls).toEqual([[true]])
      if (targetProviderId === 'target-gone') {
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
        act(() => { metadataProps().onMetadataChange?.({ targetProviderId: 'vmware-target-01' }) })
      }
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      expect(Object.entries(canvasProps().tiers)).toEqual([
        ['tier_id', { order: 3, description: 'Database tier' }], ['web', { order: 1, description: 'Web tier' }],
      ])
      expect(initialData).toEqual(before)
    })

    it('cancels an atomic cross-type source/target proposal while retaining intervening metadata and both Groups', async () => {
      const initialData = draftFixture()
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={initialData} onDirtyChange={onDirtyChange} />)
      await userEvent.setup().selectOptions(screen.getByLabelText('Provider ID *'), 'power-01')
      expect(metadataProps().initialValues).toMatchObject({ platform: 'vmware-01', targetProviderId: 'vmware-target-01' })
      expect(onDirtyChange).not.toHaveBeenCalled()
      act(() => { metadataProps().onMetadataChange?.({ description: 'Edited while pending' }) })
      await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
      expect(metadataProps().initialValues).toMatchObject({ platform: 'vmware-01', targetProviderId: 'vmware-target-01', description: 'Edited while pending' })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      expect(Object.entries(canvasProps().tiers)).toEqual([...initialData.tiers])
      expect(onDirtyChange.mock.calls).toEqual([[true]])
    })

    it('accepts the proposal patch against latest metadata and tiers without recomputing reset after provider refresh', async () => {
      const initialData = draftFixture()
      const onDirtyChange = vi.fn()
      const props = { initialData, onDirtyChange }
      const { rerender } = render(<RecoveryAppBuilder {...props} />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      await userEvent.setup().click(screen.getByRole('button', { name: 'Application details' }))
      act(() => { metadataProps().onMetadataChange?.({ platform: 'power-01', targetProviderId: '', name: 'Proposed' }) })
      act(() => { metadataProps().onMetadataChange?.({ name: 'Intervening', description: 'Latest description', targetProviderId: 'vmware-target-01' }) })
      act(() => { canvasProps().onTierAdd?.('late', { order: 9, description: 'Late tier', recovery_group: fixtureValue(initialData.tiers.get('web')).recovery_group }) })
      const previousProviders = fixtureValue(providersQuery.current.data)
      providersQuery.current.data = previousProviders.map(provider => provider.id === 'power-01' ? { ...provider, type: 'VMWARE' } : provider)
      onTestFinished(() => { providersQuery.current.data = previousProviders })
      rerender(<RecoveryAppBuilder {...props} />)
      await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change provider' }))
      expect(metadataProps().initialValues).toMatchObject({ name: 'Proposed', description: 'Latest description', platform: 'power-01', targetProviderId: '' })
      expect(onDirtyChange.mock.calls).toEqual([[true], [true], [true]])
      act(() => { metadataProps().onMetadataChange?.({ targetProviderId: 'vmware-target-01' }) })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Recovery groups & tiers' }))
      expect(Object.entries(canvasProps().tiers)).toEqual([
        ['tier_id', { order: 3, description: 'Database tier' }], ['web', { order: 1, description: 'Web tier' }], ['late', { order: 9, description: 'Late tier' }],
      ])
      expect(onDirtyChange).toHaveBeenCalledTimes(4)
    })

    it('replaces a pending proposal and preserves target-only edits outside the replacement patch', async () => {
      const previousProviders = fixtureValue(providersQuery.current.data)
      providersQuery.current.data = [...previousProviders, { ...fixtureValue(previousProviders[0]), id: 'vmware-02' }]
      onTestFinished(() => { providersQuery.current.data = previousProviders })
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder initialData={draftFixture()} onDirtyChange={onDirtyChange} />)
      act(() => { metadataProps().onMetadataChange?.({ platform: 'power-01', targetProviderId: '', name: 'Discarded proposal' }) })
      act(() => { metadataProps().onMetadataChange?.({ targetProviderId: 'target-gone' }) })
      act(() => { metadataProps().onMetadataChange?.({ platform: 'vmware-02' }) })
      expect(onDirtyChange.mock.calls).toEqual([[true]])
      await userEvent.setup().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change provider' }))
      expect(metadataProps().initialValues).toMatchObject({ name: 'Finance', platform: 'vmware-02', targetProviderId: 'target-gone' })
      expect(onDirtyChange.mock.calls).toEqual([[true], [true]])
    })

    async function assignGroupAndReturnToDetails() {
      const user = userEvent.setup()
      await openTiers()
      await user.click(screen.getByRole('button', { name: 'Add test group' }))
      expect(screen.getByText('Group id: database_group')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Application details' }))
      return user
    }

    it('asks first and, once confirmed, detaches the groups from every tier but keeps the tiers', async () => {
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)
      const user = await assignGroupAndReturnToDetails()

      await user.selectOptions(screen.getByLabelText('Provider ID *'), 'power-01')
      const dialog = screen.getByRole('dialog', { name: 'Change source provider?' })
      await user.click(within(dialog).getByRole('button', { name: 'Change provider' }))

      expect(screen.getByLabelText('Provider ID *')).toHaveValue('power-01')
      await user.selectOptions(screen.getByLabelText('Target provider ID *'), 'power-01')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Tier count: 1')).toBeInTheDocument()
      expect(screen.getByText('Group id: none')).toBeInTheDocument()
      expect(screen.getByText('Database VMs: 0')).toBeInTheDocument()
    })

    it('keeps the source and its groups when the change is cancelled', async () => {
      render(<RecoveryAppBuilder />)
      const user = await assignGroupAndReturnToDetails()

      await user.selectOptions(screen.getByLabelText('Provider ID *'), 'power-01')
      await user.click(within(screen.getByRole('dialog', { name: 'Change source provider?' })).getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('dialog', { name: 'Change source provider?' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Provider ID *')).toHaveValue('vmware-01')
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('vmware-target-01')
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Group id: database_group')).toBeInTheDocument()
    })

    it('keeps the groups when only the target changes', async () => {
      render(<RecoveryAppBuilder />)
      const user = await assignGroupAndReturnToDetails()

      await user.selectOptions(screen.getByLabelText('Target provider ID *'), '')
      await user.selectOptions(screen.getByLabelText('Target provider ID *'), 'vmware-target-01')

      expect(screen.queryByRole('dialog', { name: 'Change source provider?' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Next' }))
      expect(screen.getByText('Group id: database_group')).toBeInTheDocument()
    })

    it('changes the source without asking when no group is assigned', async () => {
      const user = userEvent.setup()
      const onDirtyChange = vi.fn()
      render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)
      fillDetails()
      onDirtyChange.mockClear()

      await user.selectOptions(screen.getByLabelText('Provider ID *'), 'power-01')

      expect(screen.queryByRole('dialog', { name: 'Change source provider?' })).not.toBeInTheDocument()
      expect(screen.getByLabelText('Provider ID *')).toHaveValue('power-01')
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('')
      expect(onDirtyChange.mock.calls).toEqual([[true]])
    })
  })

  it('opens the recovery groups and tiers step after valid details', async () => {
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Tier count: 1')).toBeInTheDocument()
    expect(screen.getByText('Database options: 2')).toBeInTheDocument()
  })

  it('keeps available groups and tier canvas in independent scroll regions', async () => {
    render(<RecoveryAppBuilder />)
    await openTiers()

    expect(screen.getByRole('list', { name: 'Available recovery groups' }).parentElement).toHaveClass(
      'custom-scrollbar',
      'overflow-y-auto',
    )
    expect(screen.getByText('Tier count: 1').parentElement?.parentElement).toHaveClass(
      'custom-scrollbar',
      'min-h-0',
      'overflow-y-auto',
    )
  })

  it('keeps tier assignments when moving to policy selection', async () => {
    render(<RecoveryAppBuilder />)
    await openPolicy()
    expect(screen.getByRole('button', { name: 'Policy set' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /Critical - Daily DR Test/ })).toBeInTheDocument()
  })

  it('requires a policy before opening orchestration', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppBuilder />)
    await openPolicy()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('button', { name: 'Orchestration' })).toHaveAttribute('aria-current', 'step')
  })

  it('keeps a deployed application pushed and explains why', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} lockPushToOrchestrator />)
    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const toggle = screen.getByRole('switch', { name: 'Push to orchestrator' })
    expect(toggle).toBeChecked()
    expect(toggle).toBeDisabled()
    expect(screen.getByText(/already deployed to Airflow/)).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Airflow provider *'), 'airflow-01')
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' })
  })

  it('locks wizard and duplicate Save while pending, then permits editing after failure', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn<(state: RecoveryApplicationFormState) => void>()
    const onDirtyChange = vi.fn()
    const { rerender } = render(<RecoveryAppBuilder onSave={onSave} onDirtyChange={onDirtyChange} />)
    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    const submitted = onSave.mock.calls[0]?.[0]
    expect(submitted?.name).toBe('Finance')
    rerender(<RecoveryAppBuilder onSave={onSave} onDirtyChange={onDirtyChange} isSaving />)
    expect(screen.getByRole('button', { name: /^Saving/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Application details' })).toBeDisabled()
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'true')
    await user.click(screen.getByRole('button', { name: /^Saving/ }))
    expect(onSave).toHaveBeenCalledOnce()
    rerender(<RecoveryAppBuilder onSave={onSave} onDirtyChange={onDirtyChange} isSaving={false} />)
    await user.click(screen.getByRole('button', { name: 'Application details' }))
    expect(screen.getByLabelText('Application Name *')).toHaveValue('Finance')
    onDirtyChange.mockClear()
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'NewerFinance' } })
    expect(screen.getByLabelText('Application Name *')).toHaveValue('NewerFinance')
    expect(onDirtyChange).toHaveBeenCalledWith(true)
    expect(submitted?.name).toBe('Finance')
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('blocks mouse and keyboard edits of metadata while saving and preserves values on unlock', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()
    const { rerender } = render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)
    fillDetails()
    onDirtyChange.mockClear()
    const input = screen.getByLabelText('Application Name *')
    input.focus()
    rerender(<RecoveryAppBuilder onDirtyChange={onDirtyChange} isSaving />)
    expect(input).toBeDisabled()
    expect(screen.getByLabelText('Provider ID *')).toBeDisabled()
    await user.type(input, 'LostEdit')
    await user.keyboard('LostKeyboardEdit')
    expect(input).toHaveValue('Finance')
    expect(onDirtyChange).not.toHaveBeenCalled()
    rerender(<RecoveryAppBuilder onDirtyChange={onDirtyChange} isSaving={false} />)
    await user.type(input, 'Updated')
    expect(input).toHaveValue('FinanceUpdated')
    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('lists only AIRFLOW providers with valid credentials in the orchestration dropdown', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppBuilder />)
    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('switch', { name: 'Push to orchestrator' }))

    const select = screen.getByLabelText('Airflow provider *')
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual([
      'Select Airflow provider',
      'Primary Airflow - AIRFLOW',
    ])
    expect(screen.getByRole('button', { name: 'Save Application' })).toBeDisabled()
    await user.selectOptions(select, 'airflow-01')
    expect(screen.getByRole('button', { name: 'Save Application' })).toBeEnabled()
  })

  it('requires an Airflow provider only when push is enabled and saves the form state', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} />)
    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const save = screen.getByRole('button', { name: 'Save Application' })
    expect(save).toBeEnabled()
    await user.click(screen.getByRole('switch', { name: 'Push to orchestrator' }))
    expect(save).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Airflow provider *'), 'airflow-01')
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      fileName: 'finance_recovery',
      policySetId: 'critical-daily-latest',
      platform: 'vmware-01',
      targetProviderId: 'vmware-target-01',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    })
  })

  it('shows backend detail while retrying a recovery-group lookup in its own step', async () => {
    const user = userEvent.setup()
    recoveryGroupsQuery.current.error = new Error('Get recovery groups request failed with status 503', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'Recovery groups are unavailable.' }),
    })
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByRole('alert')).toHaveTextContent('Recovery groups are unavailable.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(recoveryGroupsQuery.current.refresh).toHaveBeenCalledOnce()
  })

  it('shows backend detail while retrying a policy-set lookup', async () => {
    const user = userEvent.setup()
    policySetsQuery.current.error = new Error('Get policy sets request failed with status 503', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'Policy sets are unavailable.' }),
    })
    render(<RecoveryAppBuilder />)

    await openPolicy()

    expect(screen.getByRole('alert')).toHaveTextContent('Policy sets are unavailable.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(policySetsQuery.current.refetch).toHaveBeenCalledOnce()
  })

  it('shows backend detail while retrying an orchestration-provider lookup', async () => {
    const user = userEvent.setup()
    platformProvidersQuery.current.error = new Error('Get platform providers request failed with status 503', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'Orchestration providers are unavailable.' }),
    })
    render(<RecoveryAppBuilder />)

    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('switch', { name: 'Push to orchestrator' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Orchestration providers are unavailable.')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(platformProvidersQuery.current.refetch).toHaveBeenCalledOnce()
  })

  it('reports metadata and tier changes as dirty', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()
    render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    expect(onDirtyChange).toHaveBeenCalledWith(true)
    await openTiers()
    await user.click(screen.getByRole('button', { name: 'Add test group' }))
    expect(screen.getByText('Database VMs: 2')).toBeInTheDocument()
  })

  it('attaches both the group id and display name when a recovery group is added to a tier', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppBuilder />)
    await openTiers()
    await user.click(screen.getByRole('button', { name: 'Add test group' }))
    expect(screen.getByText('Group id: database_group')).toBeInTheDocument()
    expect(screen.getByText('Group name: Database Group')).toBeInTheDocument()
  })
})
