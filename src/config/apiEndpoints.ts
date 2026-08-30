export const API_ENDPOINTS = {
  discovery: {
    powerVirtualMachines: '/api/get_power_vm',
    flashSystemVolumes: '/api/get_volumes',
    flashSystemVolumeTree: '/api/get_volume_tree',
    virtualDisksByVm: '/api/vdisks_by_vm',
    tags: '/api/tags',
  },
  discoveryCache: {
    config: '/api/discovery/cache/config',
    history: '/api/discovery/cache/history',
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
  recoveryAppPolicies: {
    list: '/api/get_recovery_app_policies',
    submit: '/api/submit_recovery_app_policy',
    delete: '/api/delete_recovery_app_policy',
  },
  cleanRoomPolicies: {
    list: '/api/get_clean_room_policies',
    submit: '/api/submit_clean_room_policy',
    delete: '/api/delete_clean_room_policy',
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
    delete: '/api/delete_recovery_app',
  },
  recoveryGroups: {
    list: '/api/get_recovery_groups',
    submit: '/api/submit_recovery_group',
    delete: '/api/delete_recovery_group',
    rollback: '/api/rollback_from_orchestrator',
  },
} as const
