import { describe, expect, it } from 'vitest'
import {
  isValidRecoveryApplicationFileName,
  toRecoveryApplicationFileName,
} from './recoveryApplicationFileName'

describe('recoveryApplicationFileName', () => {
  it.each([
    'nazov',
    'naz_ov',
    'Nazov',
    'naZov',
    'recovery_app_2',
    'sample-app-recovery2',
  ])('accepts %s', (fileName) => {
    expect(isValidRecoveryApplicationFileName(fileName)).toBe(true)
  })

  it.each([
    '',
    'Test App',
    'test.app',
    '_test',
    '2test',
    '../test',
  ])('rejects %s', (fileName) => {
    expect(isValidRecoveryApplicationFileName(fileName)).toBe(false)
  })

  it('removes exactly one terminal json extension for Edit', () => {
    expect(toRecoveryApplicationFileName('sample_application.json')).toBe('sample_application')
    expect(toRecoveryApplicationFileName('sample.JSON')).toBe('sample')
    expect(toRecoveryApplicationFileName('sample.json.json')).toBe('sample.json')
  })
})
