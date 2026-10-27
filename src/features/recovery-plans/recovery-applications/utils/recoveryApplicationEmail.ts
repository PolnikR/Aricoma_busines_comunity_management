export function normalizeRecoveryApplicationEmail(value: string | null | undefined): string | null {
  const email = value?.trim() ?? ''
  return email === '' ? null : email
}

export function isValidRecoveryApplicationEmail(value: string | null | undefined): boolean {
  const email = normalizeRecoveryApplicationEmail(value)
  // Same plausible-address rule as providers/provider.py, after trimming.
  return email === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}
