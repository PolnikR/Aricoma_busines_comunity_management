import type { ProviderRecord } from '../model/providerTypes'
import type { ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

const MOCK_VERSIONS: Record<ProviderRecord['type'], string> = {
  VMWARE: '8.0.2',
  FLASHCOPY: '8.7.0',
  IBM_POWER: '7.2.5',
}

// Temporary development boundary. Replace this function with the real API
// adapter once the backend endpoint and response contract are available.
export async function mockTestProviderConnection(provider: ProviderRecord): Promise<ProviderConnectionTestResult> {
  const hostname = provider.ipAddress ? `${provider.id}.example.internal` : `${provider.id}.local`

  return Promise.resolve({
    status: 'success',
    source: 'mock',
    steps: [
      { id: 'configuration', status: 'success' },
      { id: 'credentials', status: 'success' },
      { id: 'connection', status: 'success' },
      { id: 'metadata', status: 'success' },
    ],
    providerInfo: {
      name: provider.name,
      hostname,
      version: MOCK_VERSIONS[provider.type],
      ipAddress: provider.ipAddress || '—',
      providerType: provider.type,
    },
  })
}
