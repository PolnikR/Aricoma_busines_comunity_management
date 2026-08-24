export const RECOVERY_APPLICATION_FILE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/

export function isValidRecoveryApplicationFileName(fileName: string): boolean {
  return RECOVERY_APPLICATION_FILE_NAME_PATTERN.test(fileName)
}

export const RECOVERY_APPLICATION_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/

export function isValidRecoveryApplicationName(name: string): boolean {
  return RECOVERY_APPLICATION_NAME_PATTERN.test(name)
}

export function toRecoveryApplicationFileName(file: string): string {
  return file.replace(/\.json$/i, '')
}
