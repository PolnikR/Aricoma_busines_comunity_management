export interface IdentityCapabilityView {
  id: string
  label: string
  description: string
}

export interface IdentityRoleView {
  id: string
  name: string
  description: string
  capabilityIds: string[]
}

export interface IdentityUserView {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  roleIds: string[]
  requiredActionIds: string[]
  lastLoginLabel: string
}

export interface CreateIdentityUserInput {
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
}

export interface IdentityClientView {
  id: string
  clientId: string
  displayName: string
  protocol: string
  rootUrl: string
  homeUrl: string
  enabled: boolean
  isPublicClient: boolean
  isPreview: boolean
  roles: IdentityRoleView[]
}

export interface RealmLoginPreview {
  isUserRegistrationEnabled: boolean
  isEmailLoginEnabled: boolean
  isRememberMeEnabled: boolean
  isEmailVerificationRequired: boolean
}

export interface UserProfileAttributeView {
  id: 'username' | 'email' | 'firstName' | 'lastName'
  label: string
  isRequired: boolean
  editability: 'administrator' | 'user'
}

export interface RealmPreviewView {
  realmName: string
  displayName: string
  login: RealmLoginPreview
  userProfile: UserProfileAttributeView[]
  email: {
    status: 'not-configured' | 'preview-configured'
    host: string
    port: number
    fromAddress: string
    usesTls: boolean
  }
  loginTheme: string
}

export interface RequiredActionView {
  id: string
  name: string
  description: string
  isEnabled: boolean
  isDefault: boolean
}

export interface IdentityAdminPreview {
  users: IdentityUserView[]
  clients: IdentityClientView[]
  roles: IdentityRoleView[]
  capabilities: IdentityCapabilityView[]
  realm: RealmPreviewView
  requiredActions: RequiredActionView[]
}

export interface IdentityAdminGateway {
  getPreview(): Promise<IdentityAdminPreview>
  createUser(input: CreateIdentityUserInput): Promise<IdentityUserView>
  setUserRole(userId: string, roleId: string, isAssigned: boolean): Promise<void>
  setUserRequiredAction(userId: string, actionId: string, isRequired: boolean): Promise<void>
  updateRealmLogin(input: RealmLoginPreview): Promise<void>
  updateRequiredAction(actionId: string, update: Pick<RequiredActionView, 'isEnabled' | 'isDefault'>): Promise<void>
}
