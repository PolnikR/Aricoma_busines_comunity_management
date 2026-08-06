export const API_ENDPOINTS = {
  discovery: {
    virtualMachines: '/api/vms',
    virtualMachinesByTag: '/api/vms_by_tag',
    powerVirtualMachines: '/api/get_power_vm',
    flashSystemVolumes: '/api/get_volumes',
    virtualDisksByVm: '/api/vdisks_by_vm',
    tags: '/api/tags',
  },
  providers: {
    list: '/api/get_providers',
    submit: '/api/submit_provider',
    delete: '/api/delete_provider',
  },
  platformProviders: {
    list: '/api/get_platform_providers',
    submit: '/api/submit_platform_provider',
    delete: '/api/delete_platform_provider',
  },
  snapshotPolicies: {
    list: '/api/get_policies',
    submit: '/api/submit_policy',
    delete: '/api/delete_policy',
  },
  policySets: {
    list: '/api/get_policy_sets',
    submit: '/api/submit_policy_set',
    delete: '/api/delete_policy_set',
  },
  credentials: {
    publicKey: '/api/credentials/pubkey',
    list: '/api/get_credentials',
    submit: '/api/submit_credential',
    delete: '/api/delete_credential',
  },
  recoveryApplications: {
    list: '/api/get_recovery_apps',
    submitDag: '/api/submit_recovery_dag',
  },
  recoveryGroups: {
    list: '/api/get_recovery_groups',
    submit: '/api/submit_recovery_group',
    delete: '/api/delete_recovery_group',
    rollback: '/api/rollback_from_orchestrator',
  },
} as const
