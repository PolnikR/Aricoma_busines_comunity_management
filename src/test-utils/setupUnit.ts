import { beforeEach, vi } from 'vitest'
import { keycloakMock } from './keycloakUnitMock'

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

beforeEach(() => {
  keycloakMock.token = 'test-token'
  keycloakMock.updateToken.mockReset().mockResolvedValue(true)
  keycloakMock.logout.mockReset().mockResolvedValue(undefined)
})
