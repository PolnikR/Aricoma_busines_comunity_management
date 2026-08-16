export interface User {
  id: string
  email: string
  name: string
  organizationId: string
  roleIds: string[]
  status: 'active' | 'inactive' | 'locked'
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Role {
  id: string
  name: string
  description: string
  permissionIds: string[]
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: string
  name: string
  description: string
  category: 'recovery' | 'admin' | 'audit' | 'system'
  createdAt: Date
}

export interface Organization {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  organizationId: string
  ipAddress: string
  userAgent: string
  loginTime: Date
  lastActivityTime: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'terminated'
}
