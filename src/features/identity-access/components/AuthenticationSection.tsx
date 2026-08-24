import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { RequiredActionView } from '../services/identityAdminGateway'
import { IdentityContentPanel } from './IdentityResourceLayout'

const CANONICAL_AUTH_TABS = ['flows', 'required-actions', 'policies'] as const
const VISIBLE_AUTH_TABS = [{ value: 'required-actions', label: 'Required actions' }] as const
type AuthenticationTabId = (typeof CANONICAL_AUTH_TABS)[number]

interface AuthenticationSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isAuthenticationTab(tabId: IdentityAccessTabId | null): tabId is AuthenticationTabId {
  return CANONICAL_AUTH_TABS.some(tab => tab === tabId)
}

export function AuthenticationSection({ tabId, onTabChange }: AuthenticationSectionProps) {
  const { data, error, gateway, mutate } = useIdentityAdminPreview()
  const activeTab: AuthenticationTabId = isAuthenticationTab(tabId) ? tabId : 'required-actions'

  let content
  if (activeTab === 'required-actions') {
    content = error
      ? <div className="p-4"><EmptyState title="Required actions could not be loaded" description={error.message} /></div>
      : data
        ? <RequiredActionsTable actions={data.requiredActions} onChange={(actionId, update) => mutate(() => gateway.updateRequiredAction(actionId, update))} />
        : <div className="p-4"><EmptyState title="Loading required actions" description="Reading the frontend IdentityAdminGateway adapter." /></div>
  } else if (activeTab === 'flows') {
    const columns: ColumnDef<{ id: string; name: string; description: string }>[] = [
      { id: 'name', header: 'Flow name', cell: flow => flow.name },
      { id: 'description', header: 'Description', cell: flow => flow.description },
    ]
    content = <DataTable layout="fit" columns={columns} rows={[]} rowKey={flow => flow.id} ariaLabel="Authentication flows" emptyContent={<EmptyState title="No authentication flows connected" description="The canonical Flows deep link remains ready for a future gateway adapter." />} />
  } else {
    content = <div className="p-4"><EmptyState title="Policies" description="The canonical Policies deep link remains ready for a future gateway adapter." /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs items={VISIBLE_AUTH_TABS} value={activeTab} onChange={onTabChange} ariaLabel="Authentication sections" indicator="inset" scrollControls={{ previousLabel: 'Scroll Authentication sections left', nextLabel: 'Scroll Authentication sections right' }} />
      <div className="min-w-0">{content}</div>
    </IdentityContentPanel>
  )
}

function RequiredActionsTable({ actions, onChange }: { actions: RequiredActionView[]; onChange: (actionId: string, update: Pick<RequiredActionView, 'isEnabled' | 'isDefault'>) => Promise<unknown> }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm" aria-label="Required actions">
        <thead><tr className="border-b border-border text-xs text-text-muted"><th className="p-3">Required action</th><th className="p-3">Description</th><th className="p-3 text-center">Enabled</th><th className="p-3 text-center">Default action</th></tr></thead>
        <tbody>
          {actions.map(action => (
            <tr key={action.id} className="border-b border-border last:border-0">
              <th className="p-3 font-semibold text-text-primary">{action.name}</th>
              <td className="p-3 text-text-secondary">{action.description}</td>
              <td className="p-3 text-center"><input type="checkbox" aria-label={`Enable ${action.name}`} checked={action.isEnabled} onChange={event => { void onChange(action.id, { isEnabled: event.currentTarget.checked, isDefault: action.isDefault }) }} className="size-4 accent-accent" /></td>
              <td className="p-3 text-center"><input type="checkbox" aria-label={`Set ${action.name} as default`} checked={action.isDefault} onChange={event => { void onChange(action.id, { isEnabled: action.isEnabled, isDefault: event.currentTarget.checked }) }} className="size-4 accent-accent" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border p-3 text-xs text-text-muted">Preview controls only. No Keycloak authentication configuration is changed.</p>
    </div>
  )
}
