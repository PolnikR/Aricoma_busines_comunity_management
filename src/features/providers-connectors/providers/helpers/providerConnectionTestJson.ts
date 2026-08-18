import type { ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

// Mirrors the wire shape of ProviderTestResponse (provider_id/provider_type),
// not the camelCase frontend model, so the JSON viewer matches the real API contract.
export function toProviderConnectionTestJson(result: ProviderConnectionTestResult): object {
  return {
    provider_id: result.providerId,
    provider_type: result.providerType,
    ok: result.ok,
    checks: result.checks,
  }
}
