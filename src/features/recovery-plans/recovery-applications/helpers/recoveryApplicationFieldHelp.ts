type PlatformField = 'source' | 'target' | 'workloads' | 'policySet' | 'template'
interface TemplateCatalog {
  templates: readonly { platform: string; version: string; default: boolean }[]
  verified: boolean
}

function platformSuffix(platform?: string | null) {
  return platform?.toUpperCase() === 'VMWARE' ? 'vmware'
    : platform?.toUpperCase() === 'IBM_POWER' ? 'ibmPower' : 'generic'
}

export function recoveryApplicationHelpKey(field: PlatformField, platform?: string | null): string {
  return `recoveryApplications.fieldHelp.${field}.${platformSuffix(platform)}`
}

export function recoveryApplicationTierOrderHelpKey(platform?: string | null, version?: string | null, catalog?: TemplateCatalog): string {
  const suffix = platformSuffix(platform)
  const defaults = catalog?.verified
    ? catalog.templates.filter(template => template.default && template.platform.toUpperCase() === platform?.toUpperCase())
    : []
  const resolved = version ?? (defaults.length === 1 ? defaults[0]?.version : undefined)
  const known = resolved === 'v1' && suffix !== 'generic' || resolved === 'v2' && suffix === 'ibmPower'
  return `recoveryApplications.fieldHelp.tierOrder.${known ? `${suffix}.${resolved}` : 'generic'}`
}
