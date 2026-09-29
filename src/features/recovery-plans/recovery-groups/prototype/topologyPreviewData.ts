// Development preview fixtures only. No API hooks or persistence.
export const storageProviders = [
  { id: 'ibm-flashsystem-prod', name: 'IBM FlashSystem Production', ip: '10.0.0.10', partnerProviderId: 'ibm-flashsystem-dr' },
  { id: 'ibm-flashsystem-dr', name: 'IBM FlashSystem DR', ip: '10.0.1.10', partnerProviderId: 'ibm-flashsystem-prod' },
  { id: 'ibm-flashsystem-lab', name: 'IBM FlashSystem Lab', ip: '10.0.2.10', partnerProviderId: null },
]

export const vmVolumes: Record<string, Record<string, string[]>> = {
  'ibm-flashsystem-prod': { APP01: ['V5000_VOLUME01'], APP02: ['V5000_VOLUME03', 'V5000_VOLUME04'], DB01: ['V5000_VOLUME05'] },
  'ibm-flashsystem-dr': { APP01: ['DR_APP01'], APP02: ['DR_APP02_DATA', 'DR_APP02_LOG'], DB01: ['DR_DB01'] },
  'ibm-flashsystem-lab': { APP01: ['LAB_APP01'], APP02: ['LAB_APP02'], DB01: ['LAB_DB01'] },
}

export const policySets = [
  { id: 'test_1_hour_ps', name: 'Hourly recovery', description: 'Hourly snapshots, retained for 24 hours.', snapshotPolicyId: 'hourly', recoveryAppPolicyId: 'daily', cleanRoomPolicyId: 'clean' },
  { id: 'critical_ps', name: 'Critical workloads', description: 'Snapshots every 15 minutes, retained for 48 hours.', snapshotPolicyId: 'quarter-hour', recoveryAppPolicyId: 'daily', cleanRoomPolicyId: 'clean' },
]

export const stepLabels = ['Details', 'Topology', 'Resource type', 'Compute provider', 'Virtual machines', 'Related storage', 'Policy Set', 'Orchestration']
