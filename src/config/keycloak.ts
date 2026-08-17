import Keycloak from 'keycloak-js'

// crypto.randomUUID (unlike crypto.getRandomValues) is only exposed in secure
// contexts (HTTPS or localhost). keycloak-js calls it unconditionally to build
// the OAuth state/nonce, so on our plain-HTTP server it throws before login
// even starts. Polyfill it with getRandomValues, which has no such restriction.
if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
}

export const keycloak = new Keycloak({
  url: 'http://10.99.99.53:8081',
  realm: 'aricoma',
  clientId: 'abcm-fe',
})
