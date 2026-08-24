export interface ProviderConnectionCheck {
  name: string
  status: string
  detail: string
}

export interface ProviderConnectionTestResult {
  ok: boolean
  providerId: string
  providerType: string
  checks: ProviderConnectionCheck[]
}
