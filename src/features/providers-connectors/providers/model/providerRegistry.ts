// Static provider catalogue (mock). Providers are hardcoded in Release 1 —
// no backend. Replace with API-backed data when the Provider Registry
// service is available.
export type ProviderType = 'Virtualization' | 'Cloud' | 'Storage'
export type ProviderStatus = 'Active' | 'Disabled'
export type ConnectionRole = 'Source' | 'Target'
export type ConnectionStatus = 'Connected' | 'Disconnected'

export interface ProviderConnection {
  name: string
  endpoint: string
  role: ConnectionRole
  status: ConnectionStatus
}

export interface Provider {
  id: string
  name: string
  type: ProviderType
  capabilities: string[]
  status: ProviderStatus
  version: string
  connections: ProviderConnection[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'vmware-vcenter',
    name: 'VMware vCenter',
    type: 'Virtualization',
    capabilities: ['Discovery', 'Recovery'],
    status: 'Active',
    version: '1.0',
    connections: [
      { name: 'vcenter_default', endpoint: 'vcenter-prod.company.local', role: 'Source', status: 'Connected' },
      { name: 'vcenter_default_destination', endpoint: 'vcenter-dr.company.local', role: 'Target', status: 'Connected' },
    ],
  }
]

export function getProviderById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}
