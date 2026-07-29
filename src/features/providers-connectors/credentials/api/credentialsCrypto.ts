const PUBLIC_KEY_URL = '/api/credentials/pubkey'

let cachedPublicKey: Promise<CryptoKey> | null = null

function getSubtleCrypto(): SubtleCrypto {
  const subtle = Reflect.get(globalThis.crypto, 'subtle') as SubtleCrypto | undefined
  if (!subtle) {
    throw new Error('Secure password encryption is not available in this browser context')
  }
  return subtle
}

function pemToBuffer(pem: string): ArrayBuffer {
  const encoded = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '')

  if (!encoded) throw new Error('Credential public key is empty')

  try {
    const binary = atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes.buffer
  } catch {
    throw new Error('Credential public key is invalid')
  }
}

async function fetchPublicKey(): Promise<CryptoKey> {
  const response = await fetch(PUBLIC_KEY_URL, {
    headers: { Accept: 'application/x-pem-file' },
  })
  if (!response.ok) {
    throw new Error(`Credential public key request failed with status ${String(response.status)}`)
  }

  return getSubtleCrypto().importKey(
    'spki',
    pemToBuffer(await response.text()),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
}

async function getPublicKey(): Promise<CryptoKey> {
  cachedPublicKey ??= fetchPublicKey().catch((error: unknown) => {
    cachedPublicKey = null
    throw error
  })
  return cachedPublicKey
}

function bytesToBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function encryptCredentialPassword(password: string): Promise<string> {
  if (!password) throw new Error('Credential password is required')
  const publicKey = await getPublicKey()
  const encrypted = await getSubtleCrypto().encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    new TextEncoder().encode(password),
  )
  return bytesToBase64(encrypted)
}

export function clearCredentialPublicKeyCache(): void {
  cachedPublicKey = null
}
