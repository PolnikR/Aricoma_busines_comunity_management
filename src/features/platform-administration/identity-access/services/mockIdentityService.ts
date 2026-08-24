import type { User, Role, Permission, Organization, Session } from '../models/identityTypes'

const now = new Date()
const oneHourAgo = new Date(now.getTime() - 3600000)
const oneDayAgo = new Date(now.getTime() - 86400000)
const threeDaysAgo = new Date(now.getTime() - 259200000)

export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Engineering',
    description: 'Core platform engineering team',
    status: 'active',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'org-2',
    name: 'Operations',
    description: 'IT operations and infrastructure',
    status: 'active',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
]

export const mockPermissions: Permission[] = [
  { id: 'perm-view-users', name: 'View Users', description: 'View user list and profiles', category: 'admin', createdAt: threeDaysAgo },
  { id: 'perm-manage-users', name: 'Manage Users', description: 'Create, edit, delete users', category: 'admin', createdAt: threeDaysAgo },
  { id: 'perm-manage-roles', name: 'Manage Roles', description: 'Create, edit, delete roles', category: 'admin', createdAt: threeDaysAgo },
  { id: 'perm-view-permissions', name: 'View Permissions', description: 'View available permissions', category: 'admin', createdAt: threeDaysAgo },
  { id: 'perm-view-audit', name: 'View Audit Logs', description: 'View system audit logs', category: 'audit', createdAt: threeDaysAgo },
  { id: 'perm-execute-recovery', name: 'Execute Recovery', description: 'Execute recovery plans', category: 'recovery', createdAt: threeDaysAgo },
  { id: 'perm-manage-recovery', name: 'Manage Recovery Plans', description: 'Create and edit recovery plans', category: 'recovery', createdAt: threeDaysAgo },
  { id: 'perm-view-recovery', name: 'View Recovery Plans', description: 'View recovery plans and history', category: 'recovery', createdAt: threeDaysAgo },
  { id: 'perm-manage-orgs', name: 'Manage Organizations', description: 'Create, edit, delete organizations', category: 'system', createdAt: threeDaysAgo },
  { id: 'perm-view-sessions', name: 'View Sessions', description: 'View active user sessions', category: 'audit', createdAt: threeDaysAgo },
]

export const mockRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'Administrator',
    description: 'Full system access',
    permissionIds: mockPermissions.map(p => p.id),
    organizationId: 'org-1',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'role-recovery-manager',
    name: 'Recovery Manager',
    description: 'Manage recovery plans and execute recoveries',
    permissionIds: ['perm-view-recovery', 'perm-manage-recovery', 'perm-execute-recovery'],
    organizationId: 'org-1',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    description: 'Read-only access to recovery information',
    permissionIds: ['perm-view-recovery', 'perm-view-audit'],
    organizationId: 'org-1',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
]

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'alice.smith@example.com',
    name: 'Alice Smith',
    organizationId: 'org-1',
    roleIds: ['role-admin'],
    status: 'active',
    lastLogin: oneHourAgo,
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'user-2',
    email: 'bob.johnson@example.com',
    name: 'Bob Johnson',
    organizationId: 'org-1',
    roleIds: ['role-recovery-manager'],
    status: 'active',
    lastLogin: oneDayAgo,
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'user-3',
    email: 'carol.white@example.com',
    name: 'Carol White',
    organizationId: 'org-1',
    roleIds: ['role-viewer'],
    status: 'active',
    lastLogin: new Date(now.getTime() - 172800000),
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'user-4',
    email: 'david.brown@example.com',
    name: 'David Brown',
    organizationId: 'org-2',
    roleIds: ['role-recovery-manager'],
    status: 'active',
    lastLogin: new Date(now.getTime() - 432000000),
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
  {
    id: 'user-5',
    email: 'emma.davis@example.com',
    name: 'Emma Davis',
    organizationId: 'org-2',
    roleIds: ['role-viewer'],
    status: 'inactive',
    createdAt: threeDaysAgo,
    updatedAt: threeDaysAgo,
  },
]

export const mockSessions: Session[] = [
  {
    id: 'session-1',
    userId: 'user-1',
    organizationId: 'org-1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    loginTime: oneHourAgo,
    lastActivityTime: new Date(now.getTime() - 600000),
    expiresAt: new Date(now.getTime() + 82800000),
    status: 'active',
  },
  {
    id: 'session-2',
    userId: 'user-2',
    organizationId: 'org-1',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    loginTime: oneDayAgo,
    lastActivityTime: oneDayAgo,
    expiresAt: new Date(now.getTime() - 3600000),
    status: 'expired',
  },
  {
    id: 'session-3',
    userId: 'user-4',
    organizationId: 'org-2',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    loginTime: new Date(now.getTime() - 1800000),
    lastActivityTime: new Date(now.getTime() - 1800000),
    expiresAt: new Date(now.getTime() + 84600000),
    status: 'active',
  },
]
