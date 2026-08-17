export interface CredentialRecord {
  id: string
  name: string
  description: string
  username: string
}

export interface CredentialFormData {
  id: string
  name: string
  description: string
  username: string
  password: string
}

export interface CredentialSubmitPayload extends Omit<CredentialFormData, 'password'> {
  password: string
  password_encrypted: true
}
