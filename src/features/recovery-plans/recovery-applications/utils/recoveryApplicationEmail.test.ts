import { describe, expect, it } from 'vitest'
import { isValidRecoveryApplicationEmail, normalizeRecoveryApplicationEmail } from './recoveryApplicationEmail'
describe('application notification email', () => {
  it.each([null, undefined, '', ' \t\n'])('clears %s', value => {
    expect(normalizeRecoveryApplicationEmail(value)).toBeNull()
    expect(isValidRecoveryApplicationEmail(value)).toBe(true)
  })
  it('trims boundaries without changing address case', () => {
    expect(normalizeRecoveryApplicationEmail(' Team@Example.test ')).toBe('Team@Example.test')
    expect(isValidRecoveryApplicationEmail(' Team@Example.test ')).toBe(true)
  })
  it.each(['invalid', 'a@b', 'a b@c.test', 'a@b.test,other@b.test', 'a@b.test\ninvalid'])('rejects %s', value => {
    expect(isValidRecoveryApplicationEmail(value)).toBe(false)
  })
})
