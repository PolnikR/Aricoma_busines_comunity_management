import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { CheckboxField } from '@/shared/components/form/FormControls'
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
  const { data, error, isMutating, mutationError, gateway, mutate } = useIdentityAdminPreview()
  const activeTab: AuthenticationTabId = isAuthenticationTab(tabId) ? tabId : 'required-actions'
  const tabs = VISIBLE_AUTH_TABS.map(value => ({ value, label: t(`identity.authentication.tabs.${value}`) }))

  let content
  if (activeTab === 'required-actions') {
    content = error
      ? <div className="p-4"><EmptyState title={t('identity.authentication.requiredActions.loadFailed')} description={error.message} /></div>
      : data
        ? <RequiredActionsTable actions={data.requiredActions} disabled={isMutating} onChange={(actionId, update) => mutate(() => gateway.updateRequiredAction(actionId, update))} />
        : <RequiredActionsTable actions={[]} disabled isLoading onChange={() => Promise.resolve()} />
  } else if (activeTab === 'flows') {
    const columns: ColumnDef<{ id: string; name: string; description: string }>[] = [
      { id: 'name', header: t('identity.authentication.flows.columns.name'), cell: flow => flow.name },
      { id: 'description', header: t('identity.authentication.flows.columns.description'), cell: flow => flow.description },
    ]
    content = (
      <DataTable
        layout="fit"
        columns={columns}
        rows={[]}
        rowKey={flow => flow.id}
        ariaLabel={t('identity.authentication.flows.ariaLabel')}
        emptyContent={(
          <EmptyState
            title={t('identity.authentication.flows.emptyTitle')}
            description={t('identity.authentication.flows.emptyDescription')}
          />
        )}
      />
    )
  } else {
    content = <div className="p-4"><EmptyState title={t('identity.authentication.tabs.policies')} description={t('identity.authentication.policies.description')} /></div>
  }

  return (
    <IdentityContentPanel>
      <Tabs
        items={tabs}
        value={activeTab}
        onChange={onTabChange}
        ariaLabel={t('identity.authentication.tabs.ariaLabel')}
        indicator="inset"
        scrollControls={{
          previousLabel: t('identity.authentication.tabs.scrollPrevious'),
          nextLabel: t('identity.authentication.tabs.scrollNext'),
        }}
      />
      {mutationError ? (
        <Alert
          className="m-4 mb-0"
          variant="error"
          title={t('identity.authentication.requiredActions.updateFailed')}
          description={mutationError.message}
        />
      ) : null}
      <div className="min-w-0">{content}</div>
    </IdentityContentPanel>
  )
}

function RequiredActionsTable({ actions, disabled, isLoading = false, onChange }: { actions: RequiredActionView[]; disabled: boolean; isLoading?: boolean; onChange: (actionId: string, update: Pick<RequiredActionView, 'isEnabled' | 'isDefault'>) => Promise<unknown> }) {
  const { t } = useTranslation()
  const columns = useMemo<ColumnDef<RequiredActionView>[]>(() => [
    {
      id: 'action',
      header: t('identity.authentication.requiredActions.columns.action'),
      cell: action => <span className="font-semibold text-text-primary">{action.name}</span>,
    },
    {
      id: 'description',
      header: t('identity.authentication.requiredActions.columns.description'),
      cell: action => action.description,
    },
    {
      id: 'enabled',
      header: t('identity.common.status.enabled'),
      cellClassName: 'text-center',
      cell: action => (
        <CheckboxField
          className="justify-center gap-0"
          label={<span className="sr-only">{t('identity.authentication.requiredActions.enableAria', { action: action.name })}</span>}
          checked={action.isEnabled}
          disabled={disabled}
          onChange={event => { void onChange(action.id, { isEnabled: event.currentTarget.checked, isDefault: action.isDefault }) }}
        />
      ),
    },
    {
      id: 'default',
      header: t('identity.authentication.requiredActions.columns.default'),
      cellClassName: 'text-center',
      cell: action => (
        <CheckboxField
          className="justify-center gap-0"
          label={<span className="sr-only">{t('identity.authentication.requiredActions.defaultAria', { action: action.name })}</span>}
          checked={action.isDefault}
          disabled={disabled}
          onChange={event => { void onChange(action.id, { isEnabled: action.isEnabled, isDefault: event.currentTarget.checked }) }}
        />
      ),
    },
  ], [disabled, onChange, t])

  return (
    <div>
      <DataTable
        columns={columns}
        rows={actions}
        rowKey={action => action.id}
        ariaLabel={t('identity.authentication.requiredActions.ariaLabel')}
        minWidthClassName="min-w-[42rem]"
        isLoading={isLoading}
      />
      <p className="border-t border-border p-3 text-xs text-text-muted">{t('identity.authentication.requiredActions.previewNote')}</p>
    </div>
  )
}
