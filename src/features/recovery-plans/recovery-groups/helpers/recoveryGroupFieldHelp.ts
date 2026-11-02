export function recoveryGroupComputeHelpKey(providerType?: string | null): string {
  const platform = providerType === 'VMWARE' ? 'vmware' : providerType === 'IBM_POWER' ? 'ibmPower' : 'generic'
  return `recoveryGroups.fieldHelp.compute.${platform}`
}
