// Match the backend's simple address rule, allowing an empty provider override.
export function isRecoveryGroupEmailValid(value?: string | null): boolean {
  const email = value?.trim() ?? ''
  return !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}
