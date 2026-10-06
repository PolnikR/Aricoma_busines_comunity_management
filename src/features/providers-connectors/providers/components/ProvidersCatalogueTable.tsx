import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/shared/components/badge/Badge'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  DataTableRequestState,
  DataTableSurface,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import {
  DetailField,
  DetailFieldGroup,
  DetailFieldLink,
  DetailTechnicalGroup,
  DetailView,
  DetailViewSection,
} from '@/shared/components/detail-view'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { ApiIcon, GridIcon, LayersIcon, NetworkIcon, PlugIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import {
  getTestProviderQueryKey,
  useDeleteProvider,
  useTestProvider,
} from '@/generated/query/providers/providers.gen'
import { ProvidersCreateModal } from './ProvidersCreateModal'
import { ProviderConnectionTestDialog } from './ProviderConnectionTestDialog'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import { isComputeProviderType, isPartnerProviderType } from '../model/providerCategory'
import { BackingStorageValue } from './BackingStorageValue'
import { SelectedProviderRelationships } from './SelectedProviderRelationships'
import type { ProviderRecord, ProviderRoleFilter } from '../model/providerTypes'

function credentialStatusLabel(
  status: ProviderRecord['credentialStatus'],
  t: ReturnType<typeof useTranslation>['t'],
) {
  return t(`providers.credentials.status.${status}`)
}

function credentialStatusColor(status: ProviderRecord['credentialStatus']) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function roleColor(role: ProviderRecord['role']) {
  return role === 'source' ? 'success' as const : 'warning' as const
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (providerId: string) => void,
): ColumnDef<ProviderRecord>[] {
  return [
    {
      id: 'name',
      header: t('tables.provider.name'),
      cell: (provider) => (
        <>
          <span className="block font-semibold text-text-primary">{provider.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{provider.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.provider.description'),
      cell: (provider) => <span className="block max-w-md truncate" title={provider.description ?? undefined}>{(provider.description ?? '') || '-'}</span>,
    },
    {
      id: 'type',
      header: t('tables.provider.type'),
      cell: (provider) => <Badge color="info" size="sm">{providerTypeLabel(provider.type)}</Badge>,
    },
    {
      id: 'role',
      header: t('tables.provider.role'),
      cell: (provider) => {
        const role = provider.role
        return <Badge color={roleColor(role)} size="sm">{t(`forms.role.${role}`)}</Badge>
      },
    },
    {
      id: 'ipAddress',
      header: t('tables.provider.ip'),
      cell: (provider) => <span className="font-mono text-[12px] text-text-secondary">{(provider.ipAddress ?? '') || '-'}</span>,
    },
    {
      id: 'credential',
      header: t('tables.provider.credential'),
      cell: (provider) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[12px] text-text-secondary">{provider.credentialId ?? '-'}</span>
          <Badge color={credentialStatusColor(provider.credentialStatus)} size="sm">
            {credentialStatusLabel(provider.credentialStatus, t)}
          </Badge>
        </div>
      ),
    },
    {
      id: 'json',
      header: t('tables.common.json'),
      cell: provider => (
        <Button
          size="xs"
          variant="soft"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            onViewJson(provider.id)
          }}
        >
          {t('buttons.viewJson')}
        </Button>
      ),
    },
  ]
}

interface ProvidersCatalogueTableProps {
  providers: ProviderRecord[]
  allProviders: ProviderRecord[]
  // State of the all-providers query, shown by the relationships in the detail help.
  allProvidersLoading?: boolean
  allProvidersError?: boolean
  roleFilter: ProviderRoleFilter
  onRoleFilterChange: (role: ProviderRoleFilter) => void
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function ProvidersCatalogueTable({
  providers,
  allProviders,
  allProvidersLoading = false,
  allProvidersError = false,
  roleFilter,
  onRoleFilterChange,
  isLoading,
  error,
  isRetrying,
  onRetry,
}: ProvidersCatalogueTableProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const deleteProvider = useDeleteProvider()
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [pendingRole, setPendingRole] = useState<ProviderRoleFilter>(roleFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProviderRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null)
  const [isConnectionTestOpen, setIsConnectionTestOpen] = useState(false)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const loadErrorDescription = extractBackendErrorDetail(error)
  const deleteErrorDescription = extractBackendErrorDetail(deleteProvider.error)

  const rows = useMemo(() => providers, [providers])
  const selected = rows.find((provider) => provider.id === selectedId) ?? null
  const testParams = { provider_id: selected?.id ?? '' }
  const testConnection = useTestProvider(testParams, {
    query: { enabled: isConnectionTestOpen && selected?.credentialStatus === 'ok' },
  })
  // Every open and retry runs a fresh test: resetting drops the cached result, and an
  // enabled (open) query is refetched by the reset.
  const rerunConnectionTest = () => {
    void queryClient.resetQueries({ queryKey: getTestProviderQueryKey(testParams) })
  }
  const jsonViewed = rows.find(provider => provider.id === jsonViewId) ?? null
  const columns = getColumns(t, setJsonViewId)
  const types = useMemo(
    () => [...new Set(allProviders.map((provider) => provider.type).filter(Boolean))].sort(),
    [allProviders],
  )

  const table = useTableState(rows, {
    searchFields: ['name'],
    predicate: (provider) => !typeFilter || provider.type === typeFilter,
  })

  const openFilters = () => {
    setPendingType(typeFilter)
    setPendingRole(roleFilter)
  }

  const applyFilters = () => {
    setTypeFilter(pendingType)
    onRoleFilterChange(pendingRole)
    table.setPage(1)
    setSelectedId(null)
  }

  const clearFilters = () => {
    setPendingType('')
    setPendingRole('all')
    setTypeFilter('')
    onRoleFilterChange('all')
    table.setPage(1)
    setSelectedId(null)
  }

  const activeFilterCount = Number(Boolean(typeFilter)) + Number(roleFilter !== 'all')

  const openConnectionTest = () => {
    if (selected?.credentialStatus !== 'ok') return
    rerunConnectionTest()
    setIsConnectionTestOpen(true)
  }

  const closeConnectionTest = () => {
    setIsConnectionTestOpen(false)
  }

  const toolbar = (
    <>
      {deleteProvider.error ? (
        <Alert
          variant="error"
          className="mx-4 mt-4"
          title={t('dialogs.deleteProvider')}
          {...(deleteErrorDescription ? { description: deleteErrorDescription } : {})}
        />
      ) : null}
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('providers.searchPlaceholder')}
        searchLabel={t('providers.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('providers.filterTitle')}
        activeFilterCount={activeFilterCount}
        onFilterOpen={openFilters}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        filterControlsDisabled={isLoading}
        filterPanel={
          <>
            <Field label={t('details.type')} htmlFor="provider-type-filter">
              <Select id="provider-type-filter" value={pendingType} disabled={isLoading} onChange={(event) => { setPendingType(event.target.value) }}>
                <option value="">{t('providers.allTypes')}</option>
                {types.map((type) => <option key={type} value={type}>{providerTypeLabel(type)}</option>)}
              </Select>
            </Field>
            <Field label={t('forms.role')} htmlFor="provider-role-filter">
              <Select
                id="provider-role-filter"
                value={pendingRole}
                disabled={isLoading}
                onChange={(event) => { setPendingRole(event.target.value as ProviderRoleFilter) }}
              >
                <option value="all">{t('providers.allRoles')}</option>
                <option value="source">{t('forms.role.source')}</option>
                <option value="target">{t('forms.role.target')}</option>
              </Select>
            </Field>
          </>
        }
      />
    </>
  )

  const pagination = (!error || allProviders.length > 0) ? (
    <DataTablePagination
      page={table.page}
      pageSize={table.pageSize}
      total={table.total}
      isLoading={isLoading}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
    />
  ) : null

  return (
    <>
      <DataTableSurface
        ariaLabel={t(isLoading ? 'providers.loading' : 'providers.tableLabel')}
        toolbar={toolbar}
        pagination={pagination}
      >
      <DataTableRequestState
        hasCachedData={allProviders.length > 0}
        error={error ? {
          title: t('providers.loadFailed'),
          ...(loadErrorDescription ? { description: loadErrorDescription } : {}),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          rowKey={(provider) => provider.id}
          isLoading={isLoading}
          density={table.density}
          minWidthClassName="min-w-215"
          ariaLabel={t(isLoading ? 'providers.loading' : 'providers.tableLabel')}
          onRowClick={(provider) => { setSelectedId(provider.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('providers.noMatches') : t('providers.empty')}
        />
      </DataTableRequestState>
      </DataTableSurface>

      {/* Hidden, not just covered, while the connection test dialog is open. */}
      {selected && !isConnectionTestOpen ? (
        <DetailView
          // Keyed by provider so each newly opened provider starts expanded on Overview.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('drawer.entity.provider')}
          title={selected.name}
          statuses={[
            <Badge key="type" color="info" size="sm">{providerTypeLabel(selected.type)}</Badge>,
            <Badge key="role" color={roleColor(selected.role)} size="sm">{t(`forms.role.${selected.role}`)}</Badge>,
            <Badge key="credential" color={credentialStatusColor(selected.credentialStatus)} size="sm">
              {credentialStatusLabel(selected.credentialStatus, t)}
            </Badge>,
          ]}
          headerActions={(
            <>
              <Button
                size="xs"
                variant="soft"
                className="border border-accent/30 bg-accent-soft text-accent shadow-none hover:border-accent hover:bg-accent-soft hover:text-accent"
                startIcon={<PlugIcon className="size-3.5" />}
                onClick={openConnectionTest}
                disabled={selected.credentialStatus !== 'ok'}
                aria-describedby={selected.credentialStatus !== 'ok' ? 'provider-test-credential-hint' : undefined}
                title={selected.credentialStatus !== 'ok' ? t('providers.connectionTest.credentialRequired') : undefined}
              >
                {t('providers.connectionTest.button')}
              </Button>
              {selected.credentialStatus !== 'ok' ? (
                <span id="provider-test-credential-hint" className="sr-only">{t('providers.connectionTest.credentialRequired')}</span>
              ) : null}
              <KeyedHelpPopover helpKey="providers.help" sections={['role', 'credential']} width="wide">
                <SelectedProviderRelationships
                  allProviders={allProviders}
                  selectedProviderId={selected.id}
                  isLoading={allProvidersLoading}
                  isError={allProvidersError}
                />
              </KeyedHelpPopover>
            </>
          )}
          ariaLabel={t('drawer.providerDetail')}
          closeLabel={t('drawer.closeProvider')}
          footerStart={(
            <Button
              onClick={() => { setDeleteTarget(selected) }}
              size="sm"
              variant="danger"
            >
              {t('buttons.delete')}
            </Button>
          )}
          footer={(
            <Button
              onClick={() => { setEditing(selected); setSelectedId(null) }}
              size="sm"
            >
              {t('buttons.edit')}
            </Button>
          )}
        >
          {/* Type, role and credential state are header statuses and are not repeated here. */}
          <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
            <DetailFieldGroup>
              <DetailField label={t('details.type')} value={providerTypeLabel(selected.type)} emphasis />
              <DetailField label={t('details.notificationEmail')} value={selected.notificationEmail} />
              <DetailField label={t('details.description')} value={selected.description} wide />
              <DetailField
                label={t('details.url')}
                value={selected.url ? <DetailFieldLink href={selected.url} external>{selected.url}</DetailFieldLink> : null}
                wide
              />
            </DetailFieldGroup>
          </DetailViewSection>
          <DetailViewSection id="connection" title={t('detailView.connection')} icon={NetworkIcon}>
            <DetailFieldGroup>
              <DetailField label={t('details.ipAddress')} value={selected.ipAddress} mono copyValue={selected.ipAddress ?? undefined} />
              <DetailField label={t('details.credential')} value={selected.credentialId} mono />
            </DetailFieldGroup>
          </DetailViewSection>
          {isPartnerProviderType(selected.type) || isComputeProviderType(selected.type) ? (
            <DetailViewSection id="relationships" title={t('resources.relationships.title')} icon={LayersIcon}>
              <DetailFieldGroup>
                {isPartnerProviderType(selected.type) ? (
                  <DetailField
                    label={t('forms.partnerProvider')}
                    value={selected.partnerProviderId
                      ? (allProviders.find(provider => provider.id === selected.partnerProviderId)?.name ?? selected.partnerProviderId)
                      : t('forms.partnerProviderNone')}
                    secondary={selected.partnerProviderId ? <span className="font-mono">{selected.partnerProviderId}</span> : undefined}
                  />
                ) : null}
                {isComputeProviderType(selected.type) ? (
                  <DetailField
                    label={t('details.backingStorage')}
                    value={<BackingStorageValue providerId={selected.id} providers={allProviders} />}
                    wide
                  />
                ) : null}
              </DetailFieldGroup>
            </DetailViewSection>
          ) : null}
          <DetailViewSection id="technical" title={t('detailView.technical')} icon={ApiIcon} description={t('detailView.technicalDescription')} secondary>
            <DetailTechnicalGroup>
              <DetailField label={t('details.providerId')} value={selected.id} copyValue={selected.id} />
              <DetailField label={t('details.orchestratorConnId')} value={selected.orchestratorConnId} copyValue={selected.orchestratorConnId ?? undefined} />
            </DetailTechnicalGroup>
          </DetailViewSection>
        </DetailView>
      ) : null}

      <ProviderConnectionTestDialog
        open={isConnectionTestOpen && selected !== null}
        providerName={selected?.name ?? ''}
        providerId={selected?.id ?? ''}
        providerRole={selected?.role ?? 'source'}
        isPending={testConnection.isPending}
        result={testConnection.data ?? null}
        error={testConnection.error instanceof Error ? testConnection.error : null}
        onClose={closeConnectionTest}
        onRetry={rerunConnectionTest}
      />

      {editing ? (
        <ProvidersCreateModal
          open
          onClose={() => { setEditing(null) }}
          existingProviders={allProviders}
          provider={editing}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteProvider')}
        message={t('dialogs.deleteProviderMessage').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deleteProvider.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteProvider.mutate({ params: { provider_id: deleteTarget.id } }, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('providers.jsonViewer.title')}
        data={jsonViewed}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </>
  )
}
