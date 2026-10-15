import { render, screen } from '@testing-library/react'
import { createMemoryRouter, createRoutesFromElements, Outlet, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../AppRoutes'

// We deliberately replace page modules, not route factories. Navigating the real
// router therefore catches a changed JSX page binding AND a wrong lazy import.
// No auth, API or provider setup is needed just to prove a route's page identity.
vi.mock('@/layouts/app-shell/AppShell', () => ({ AppShell: () => <Outlet /> }))
// Only the page-to-route binding is under test; fallback identity is asserted by
// routeContract.test.tsx. Do not require language/theme providers for placeholders.
vi.mock('@/shared/components/page/RouteLoadingSkeleton', () => ({ RouteLoadingSkeleton: () => <div>Loading route</div> }))
vi.mock('@/features/discovery-inventory/infrastructure/components/InfrastructureTopologySkeleton', () => ({ InfrastructureTopologySkeleton: () => <div>Loading topology</div> }))

vi.mock('@/features/dashboard/pages/OverviewPage', () => ({ OverviewPage: () => <h1>OverviewPage</h1> }))
vi.mock('@/features/platform-administration/platform-providers/pages/PlatformProvidersPage', () => ({ PlatformProvidersPage: () => <h1>PlatformProvidersPage</h1> }))
vi.mock('@/features/platform-administration/configuration/pages/ConfigurationPage', () => ({ ConfigurationPage: () => <h1>ConfigurationPage</h1> }))
vi.mock('@/features/platform-administration/identity-access/pages/IdentityAccessPage', () => ({ IdentityAccessPage: () => <h1>IdentityAccessPage</h1> }))
vi.mock('@/features/platform-administration/audit/pages/AuditPage', () => ({ AuditPage: () => <h1>AuditPage</h1> }))
vi.mock('@/features/providers-connectors/providers/pages/ProvidersPage', () => ({ ProvidersPage: () => <h1>ProvidersPage</h1> }))
vi.mock('@/features/providers-connectors/credentials/pages/CredentialsPage', () => ({ CredentialsPage: () => <h1>CredentialsPage</h1> }))
vi.mock('@/features/providers-connectors/providers/pages/ProviderDetailPage', () => ({ ProviderDetailPage: () => <h1>ProviderDetailPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage', () => ({ RecoveryGroupsListPage: () => <h1>RecoveryGroupsListPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage', () => ({ RecoveryGroupBuilderPage: () => <h1>RecoveryGroupBuilderPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage', () => ({ RecoveryGroupEditorPage: () => <h1>RecoveryGroupEditorPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage', () => ({ RecoveryApplicationsListPage: () => <h1>RecoveryApplicationsListPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage', () => ({ RecoveryApplicationBuilderPage: () => <h1>RecoveryApplicationBuilderPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage', () => ({ RecoveryApplicationEditorPage: () => <h1>RecoveryApplicationEditorPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage', () => ({ RecoveryRunsPage: () => <h1>RecoveryRunsPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage', () => ({ SnapshotPoliciesPage: () => <h1>SnapshotPoliciesPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage', () => ({ RecoveryAppPoliciesPage: () => <h1>RecoveryAppPoliciesPage</h1> }))
vi.mock('@/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage', () => ({ CleanRoomPoliciesPage: () => <h1>CleanRoomPoliciesPage</h1> }))
vi.mock('@/features/recovery-plans/policy-sets/pages/PolicySetsPage', () => ({ PolicySetsPage: () => <h1>PolicySetsPage</h1> }))
vi.mock('@/features/recovery-actions/pages/RecoveryActionsValidatePage', () => ({ RecoveryActionsValidatePage: () => <h1>RecoveryActionsValidatePage</h1> }))
vi.mock('@/features/recovery-actions/pages/RecoveryActionsExecutePage', () => ({ RecoveryActionsExecutePage: () => <h1>RecoveryActionsExecutePage</h1> }))
vi.mock('@/features/recovery-actions/pages/RecoveryActionsSchedulePage', () => ({ RecoveryActionsSchedulePage: () => <h1>RecoveryActionsSchedulePage</h1> }))
vi.mock('@/features/recovery-actions/pages/RecoveryActionsHistoryPage', () => ({ RecoveryActionsHistoryPage: () => <h1>RecoveryActionsHistoryPage</h1> }))
vi.mock('@/features/discovery-inventory/resources/pages/ResourcesPage', () => ({ ResourcesPage: () => <h1>ResourcesPage</h1> }))
vi.mock('@/features/discovery-inventory/resources-ise/pages/ResourcesIsePage', () => ({ ResourcesIsePage: () => <h1>ResourcesIsePage</h1> }))
vi.mock('@/features/discovery-inventory/infrastructure/pages/InfrastructurePage', () => ({ InfrastructurePage: () => <h1>InfrastructurePage</h1> }))
vi.mock('@/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage', () => ({ DiscoverySettingsPage: () => <h1>DiscoverySettingsPage</h1> }))

const pageRoutes = [
  ['/', 'OverviewPage'],
  ['/platform-administration/platform-providers', 'PlatformProvidersPage'],
  ['/platform-administration/configuration', 'ConfigurationPage'],
  ['/platform-administration/identity-access', 'IdentityAccessPage'],
  ['/platform-administration/audit-retention', 'AuditPage'],
  ['/providers-connectors/providers', 'ProvidersPage'],
  ['/providers-connectors/credentials', 'CredentialsPage'],
  ['/providers-connectors/providers/provider-1', 'ProviderDetailPage'],
  ['/recovery-plans/recovery-groups', 'RecoveryGroupsListPage'],
  ['/recovery-plans/recovery-groups/create', 'RecoveryGroupBuilderPage'],
  ['/recovery-plans/recovery-groups/group-1/edit', 'RecoveryGroupEditorPage'],
  ['/recovery-plans/recovery-applications', 'RecoveryApplicationsListPage'],
  ['/recovery-plans/recovery-applications/create', 'RecoveryApplicationBuilderPage'],
  ['/recovery-plans/recovery-applications/app-1/edit', 'RecoveryApplicationEditorPage'],
  ['/recovery-plans/recovery-runs', 'RecoveryRunsPage'],
  ['/recovery-plans/recovery-policies/snapshot', 'SnapshotPoliciesPage'],
  ['/recovery-plans/recovery-policies/application-recovery', 'RecoveryAppPoliciesPage'],
  ['/recovery-plans/recovery-policies/clean-room', 'CleanRoomPoliciesPage'],
  ['/recovery-plans/policy-sets', 'PolicySetsPage'],
  ['/recovery-actions/validate', 'RecoveryActionsValidatePage'],
  ['/recovery-actions/execute', 'RecoveryActionsExecutePage'],
  ['/recovery-actions/schedule', 'RecoveryActionsSchedulePage'],
  ['/recovery-actions/history', 'RecoveryActionsHistoryPage'],
  ['/discovery-inventory/resources', 'ResourcesPage'],
  ['/discovery-inventory/resources-ise', 'ResourcesIsePage'],
  ['/discovery-inventory/infrastructure', 'InfrastructurePage'],
  ['/discovery-inventory/discovery-settings', 'DiscoverySettingsPage'],
] as const

describe('ABCO route page bindings', () => {
  it.each(pageRoutes)('%s renders %s', async (url, expectedPage) => {
    const router = createMemoryRouter(createRoutesFromElements(AppRoutes()), {
      initialEntries: [url],
    })
    const view = render(<RouterProvider router={router} />)
    try {
      expect(await screen.findByRole('heading', { name: expectedPage })).toBeVisible()
    } finally {
      view.unmount()
      router.dispose()
    }
  })
})
