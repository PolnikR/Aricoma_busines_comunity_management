import { describe, expect, it } from 'vitest'
import { createMockIdentityAdminGateway } from './mockIdentityAdminGateway'

describe('mockIdentityAdminGateway', () => {
  it('keeps preview mutations transport-neutral and in memory', async () => {
    const gateway = createMockIdentityAdminGateway()
    const before = await gateway.getPreview()

    const created = await gateway.createUser({ username: 'preview.user', email: 'preview@example.com', firstName: 'Preview', lastName: 'User', enabled: true })
    await gateway.setUserRole(created.id, 'role-viewer', true)
    await gateway.setUserRequiredAction(created.id, 'verify-email', true)
    await gateway.updateRealmLogin({ ...before.realm.login, isUserRegistrationEnabled: true })
    await gateway.updateRequiredAction('verify-email', { isEnabled: true, isDefault: true })

    const after = await gateway.getPreview()
    expect(after.users).toHaveLength(before.users.length + 1)
    expect(after.users.find(user => user.id === created.id)).toMatchObject({ roleIds: ['role-viewer'], requiredActionIds: ['verify-email'] })
    expect(after.realm.login.isUserRegistrationEnabled).toBe(true)
    expect(after.requiredActions.find(action => action.id === 'verify-email')).toMatchObject({ isEnabled: true, isDefault: true })

    expect(before.users).toHaveLength(2)
    expect(before.realm.login.isUserRegistrationEnabled).toBe(false)
  })
})
