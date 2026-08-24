import type {
  CreateIdentityUserInput,
  IdentityAdminGateway,
  IdentityAdminPreview,
  IdentityUserView,
  RealmLoginPreview,
  RequiredActionView,
} from './identityAdminGateway'

const initialPreview: IdentityAdminPreview = {
  capabilities: [
    { id: 'identity-admin', label: 'Identity administration', description: 'Manage users and application access.' },
    { id: 'recovery-manage', label: 'Recovery management', description: 'Create, update, and execute recovery plans.' },
    { id: 'recovery-view', label: 'Recovery visibility', description: 'View recovery plans, history, and audit information.' },
  ],
  roles: [
    { id: 'role-admin', name: 'Administrator', description: 'Full ABCO application administration.', capabilityIds: ['identity-admin', 'recovery-manage', 'recovery-view'] },
    { id: 'role-recovery-manager', name: 'Recovery Manager', description: 'Manage and execute recovery work.', capabilityIds: ['recovery-manage', 'recovery-view'] },
    { id: 'role-viewer', name: 'Viewer', description: 'Read-only access to recovery information.', capabilityIds: ['recovery-view'] },
  ],
  users: [
    { id: 'user-1', username: 'alice.smith', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith', enabled: true, roleIds: ['role-admin'], requiredActionIds: ['update-password'], lastLoginLabel: '23 Aug 2026' },
    { id: 'user-2', username: 'bob.jones', email: 'bob@example.com', firstName: 'Bob', lastName: 'Jones', enabled: false, roleIds: [], requiredActionIds: [], lastLoginLabel: 'Never' },
  ],
  clients: [
    {
      id: 'abco-frontend', clientId: 'abco-frontend', displayName: 'ABCO frontend', protocol: 'openid-connect',
      rootUrl: 'https://app.example.invalid', homeUrl: 'https://app.example.invalid/', enabled: true,
      isPublicClient: true, isPreview: true,
      roles: [
        { id: 'role-admin', name: 'Administrator', description: 'Full ABCO application administration.', capabilityIds: ['identity-admin', 'recovery-manage', 'recovery-view'] },
        { id: 'role-recovery-manager', name: 'Recovery Manager', description: 'Manage and execute recovery work.', capabilityIds: ['recovery-manage', 'recovery-view'] },
        { id: 'role-viewer', name: 'Viewer', description: 'Read-only access to recovery information.', capabilityIds: ['recovery-view'] },
      ],
    },
  ],
  realm: {
    realmName: 'abco', displayName: 'ABCO',
    login: { isUserRegistrationEnabled: false, isEmailLoginEnabled: true, isRememberMeEnabled: true, isEmailVerificationRequired: true },
    userProfile: [
      { id: 'username', label: 'Username', isRequired: true, editability: 'administrator' },
      { id: 'email', label: 'Email', isRequired: true, editability: 'user' },
      { id: 'firstName', label: 'First name', isRequired: true, editability: 'user' },
      { id: 'lastName', label: 'Last name', isRequired: true, editability: 'user' },
    ],
    email: { status: 'preview-configured', host: 'smtp.example.invalid', port: 587, fromAddress: 'no-reply@example.invalid', usesTls: true },
    loginTheme: 'abco',
  },
  requiredActions: [
    { id: 'update-password', name: 'Update Password', description: 'Prompt the user to choose a new password.', isEnabled: true, isDefault: false },
    { id: 'verify-email', name: 'Verify Email', description: 'Require confirmation of the user email address.', isEnabled: true, isDefault: false },
    { id: 'update-profile', name: 'Update Profile', description: 'Prompt the user to complete required profile fields.', isEnabled: true, isDefault: false },
    { id: 'configure-otp', name: 'Configure OTP', description: 'Prompt the user to configure a one-time password authenticator.', isEnabled: true, isDefault: false },
  ],
}

function clonePreview(preview: IdentityAdminPreview): IdentityAdminPreview {
  return structuredClone(preview)
}

export function createMockIdentityAdminGateway(seed: IdentityAdminPreview = initialPreview): IdentityAdminGateway {
  const preview = clonePreview(seed)

  return {
    getPreview() { return Promise.resolve(clonePreview(preview)) },
    createUser(input: CreateIdentityUserInput) {
      const user: IdentityUserView = {
        id: `preview-user-${String(preview.users.length + 1)}`,
        ...input,
        roleIds: [],
        requiredActionIds: [],
        lastLoginLabel: 'Never',
      }
      preview.users = [...preview.users, user]
      return Promise.resolve(structuredClone(user))
    },
    setUserRole(userId: string, roleId: string, isAssigned: boolean) {
      preview.users = preview.users.map(user => user.id === userId
        ? { ...user, roleIds: isAssigned ? Array.from(new Set([...user.roleIds, roleId])) : user.roleIds.filter(id => id !== roleId) }
        : user)
      return Promise.resolve()
    },
    setUserRequiredAction(userId: string, actionId: string, isRequired: boolean) {
      preview.users = preview.users.map(user => user.id === userId
        ? { ...user, requiredActionIds: isRequired ? Array.from(new Set([...user.requiredActionIds, actionId])) : user.requiredActionIds.filter(id => id !== actionId) }
        : user)
      return Promise.resolve()
    },
    updateRealmLogin(input: RealmLoginPreview) { preview.realm.login = { ...input }; return Promise.resolve() },
    updateRequiredAction(actionId: string, update: Pick<RequiredActionView, 'isEnabled' | 'isDefault'>) {
      preview.requiredActions = preview.requiredActions.map(action => action.id === actionId ? { ...action, ...update } : action)
      return Promise.resolve()
    },
  }
}

export const mockIdentityAdminGateway = createMockIdentityAdminGateway()
