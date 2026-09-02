import { routes } from './routes'

export interface ModulePageConfig {
  path: string
  eyebrow: string
  title: string
  description: string
  excelSource: string
  apiBoundary: string
  workflowItems: string[]
}

export const platformAdministrationPages: ModulePageConfig[] = [
  {
    path: routes.platformProviders,
    eyebrow: 'Platform Administration',
    title: 'Platform providers',
    description: 'Administration of orchestration and platform-level provider connections.',
    excelSource: 'Platform provider registry',
    apiBoundary: 'GET /api/get_platform_providers',
    workflowItems: ['Platform provider list', 'Platform provider detail', 'Lifecycle actions'],
  },
  {
    path: routes.platformConfiguration,
    eyebrow: 'Platform Administration',
    title: 'Configuration',
    description: 'Central configuration workspace for application-wide settings, validation, versioning, maintenance mode, and time localization.',
    excelSource: '10 PA Requirements: System configuration; Time and localization',
    apiBoundary: 'GET /api/platform/configuration',
    workflowItems: ['Configuration list', 'Validation results', 'Version history'],
  },
  {
    path: routes.platformIdentityAccess,
    eyebrow: 'Platform Administration',
    title: 'Identity & access',
    description: 'Administration workspace for emergency access, roles, sessions, and internal service identities.',
    excelSource: '10 PA Requirements: Identity and access; Internal API security; Service identities',
    apiBoundary: 'GET /api/platform/identity-access',
    workflowItems: ['Users and roles', 'Session controls', 'Service identities'],
  },
]

export const providersConnectorsPages: ModulePageConfig[] = [
  {
    path: routes.providersConnectors,
    eyebrow: 'Providers & Connectors',
    title: 'Providers',
    description: 'Provider registry workspace for provider identity, lifecycle state, metadata, ownership, tags, and supported provider types.',
    excelSource: '21 PC Requirements: Provider Registry',
    apiBoundary: 'GET /api/providers',
    workflowItems: ['Provider list', 'Provider detail', 'Lifecycle actions'],
  },
  {
    path: routes.providerCredentials,
    eyebrow: 'Providers & Connectors',
    title: 'Credentials',
    description: 'Credential reference workspace for provider credential type, rotation, validation, masking, and credential use audit.',
    excelSource: '21 PC Requirements: Credentials',
    apiBoundary: 'GET /api/providers/credentials',
    workflowItems: ['Credential references', 'Validation status', 'Rotation history'],
  },
  {
    path: routes.providerDiscoverySettings,
    eyebrow: 'Providers & Connectors',
    title: 'Discovery settings',
    description: 'Provider discovery settings for manual discovery, scheduled discovery, scope exclusions, pagination, throttling, and partial results.',
    excelSource: '21 PC Requirements: Discovery',
    apiBoundary: 'GET /api/providers/discovery-settings',
    workflowItems: ['Schedules', 'Scope rules', 'Discovery limits'],
  },
]

export const discoveryInventoryPlaceholderPages: ModulePageConfig[] = [
  {
    path: routes.discoveryJobs,
    eyebrow: 'Discovery & Inventory',
    title: 'Discovery jobs',
    description: 'Workspace for manual discovery, scheduled jobs, cancellation, retry, and progress across discovery phases.',
    excelSource: '32 DI Requirements: Discovery Management; Direct Discovery',
    apiBoundary: 'GET /api/discovery/jobs',
    workflowItems: ['Job list', 'Progress phases', 'Retry and cancel actions'],
  },
]

export const remainingEpicPages: ModulePageConfig[] = [
  {
    path: routes.storageOrchestration,
    eyebrow: 'EP-04',
    title: 'Storage Orchestration',
    description: 'Prepared frontend boundary for storage orchestration workflows defined by a future detailed specification.',
    excelSource: 'Epics row 5: EP-04 Storage Orchestration',
    apiBoundary: 'Pending backend API contract for EP-04',
    workflowItems: ['Storage resources', 'Orchestration requests', 'Operation status'],
  },
  {
    path: routes.recoveryPlans,
    eyebrow: 'EP-07',
    title: 'Recovery Plans',
    description: 'Prepared frontend boundary for recovery planning workflows defined by a future detailed specification.',
    excelSource: 'Epics row 8: EP-07 Recovery Plans',
    apiBoundary: 'Pending backend API contract for EP-07',
    workflowItems: ['Recovery plans', 'Plan validation', 'Plan status'],
  },
]
