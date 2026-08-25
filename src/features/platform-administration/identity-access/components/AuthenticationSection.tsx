import { useTranslation } from '@/hooks/useTranslation'
import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { RequiredActionView } from '../services/identityAdminGateway'
import { IdentityContentPanel } from './IdentityResourceLayout'

const CANONICAL_AUTH_TABS = ['flows', 'required-actions', 'policies'] as const
const VISIBLE_AUTH_TABS = ['required-actions'] as const
type AuthenticationTabId = (typeof CANONICAL_AUTH_TABS)[number]

interface AuthenticationSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isAuthenticationTab(tabId: IdentityAccessTabId | null): tabId is AuthenticationTabId {
  return CANONICAL_AUTH_TABS.some(tab => tab === tabId)
}

export function AuthenticationSection({ tabId, onTabChange }: AuthenticationSectionProps) {
  const { t } = useTranslation()
  const { data, error, gateway, mutate } = useIdentityAdminPreview()
  const activeTab: AuthenticationTabId = isAuthenticationTab(tabId) ? tabId : 'required-actions'
  const tabs = VISIBLE_AUTH_TABS.map(value => ({ value, label: t(`identity.authentication.tabs.${value}`) }))

  let content
  if (activeTab === 'required-actions') {
    content = error
      ? <div className="p-4"><EmptyState title={t('identity.authentication.requiredActions.loadFailed')} description={error.message} /></div>
      : data
        ? <RequiredActionsTable actions={data.requiredActions} onChange={(actionId, update) => mutate(() => gateway.updateRequiredAction(actionId, update))} />
        : <div className="p-4"><EmptyState title={t('identity.authentication.requiredActions.loading')} description={t('identity.common.adapterReading')} /></div>
  } else if (activeTab === 'flows') {
    const columns: ColumnDef<{ id: string; name: string; description: string }>[] = [
      { id: 'name', header: t('identity.authentication.flows.columns.name'), cell: flow => flow.name },
      { id: 'description', header: t('identity.authentication.flows.columns.description'), cell: flow => flow.description },
    ]
    content = <DataTable layout="fit" columns={columns} rows={[]} rowKey={flow => flow.id} ariaLabel={t('identity.authentication.flows.ariaLabel')} emptyContent={<EmptyState title={t('identity.authentication.flows.emptyTitle')} description={t('identity.authentication.flows.emptyDescription')} />} />
  } else {
    content = <div className="p-4"><EmptyState title={t('identity.authentication.tabs.policies')} description={t('identity.authentication.policies.description')} /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs items={tabs} value={activeTab} onChange={onTabChange} ariaLabel={t('identity.authentication.tabs.ariaLabel')} indicator="inset" scrollControls={{ previousLabel: t('identity.authentication.tabs.scrollPrevious'), nextLabel: t('identity.authentication.tabs.scrollNext') }} />
      <div className="min-w-0">{content}</div>
    </IdentityContentPanel>
  )
}

function RequiredActionsTable({ actions, onChange }: { actions: RequiredActionView[]; onChange: (actionId: string, update: Pick<RequiredActionView, 'isEnabled' | 'isDefault'>) => Promise<unknown> }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[42rem] text-left text-sm" aria-label={t('identity.authentication.requiredActions.ariaLabel')}>
        <thead><tr className="border-b border-border text-xs text-text-muted"><th className="p-3">{t('identity.authentication.requiredActions.columns.action')}</th><th className="p-3">{t('identity.authentication.requiredActions.columns.description')}</th><th className="p-3 text-center">{t('identity.common.status.enabled')}</th><th className="p-3 text-center">{t('identity.authentication.requiredActions.columns.default')}</th></tr></thead>
        <tbody>
          {actions.map(action => (
            <tr key={action.id} className="border-b border-border last:border-0">
              <th className="p-3 font-semibold text-text-primary">{action.name}</th>
              <td className="p-3 text-text-secondary">{action.description}</td>
              <td className="p-3 text-center"><input type="checkbox" aria-label={t('identity.authentication.requiredActions.enableAria', { action: action.name })} checked={action.isEnabled} onChange={event => { void onChange(action.id, { isEnabled: event.currentTarget.checked, isDefault: action.isDefault }) }} className="size-4 accent-accent" /></td>
              <td className="p-3 text-center"><input type="checkbox" aria-label={t('identity.authentication.requiredActions.defaultAria', { action: action.name })} checked={action.isDefault} onChange={event => { void onChange(action.id, { isEnabled: action.isEnabled, isDefault: event.currentTarget.checked }) }} className="size-4 accent-accent" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border p-3 text-xs text-text-muted">{t('identity.authentication.requiredActions.previewNote')}</p>
    </div>
  )
}
