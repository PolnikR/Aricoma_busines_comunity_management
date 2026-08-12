import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { DataTable, type ColumnDef } from '@/shared/components/data-table/DataTable'
import { DetailDrawer, DetailRow } from '@/shared/components/data-table/DetailDrawer'
import { Field, Select } from '@/shared/components/form/FormControls'
import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { RecoveryActionsPageShell } from '../components/RecoveryActionsPageShell'
import { RecoveryTestStatusBadge } from '../components/RecoveryTestStatusBadge'
import { recoveryHistory } from '../mocks/recoveryActionsMocks'
import type { RecoveryTestMode, RecoveryTestRun } from '../model/recoveryActionTypes'

type HistoryFilter = 'all' | RecoveryTestMode

export function RecoveryActionsHistoryPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [selectedRun, setSelectedRun] = useState<RecoveryTestRun | null>(null)
  const [period, setPeriod] = useState('30')
  const rows = useMemo(() => filter === 'all' ? recoveryHistory : recoveryHistory.filter((run) => run.mode === filter), [filter])
  const columns: ColumnDef<RecoveryTestRun>[] = [
    { id: 'started', header: t('pages.recoveryActions.history.columns.started'), cell: (run) => formatDate(run.startedAt) },
    { id: 'mode', header: t('pages.recoveryActions.history.columns.mode'), cell: (run) => <span className="capitalize">{t(`pages.recoveryActions.history.mode.${run.mode}`)}</span> },
    { id: 'group', header: t('pages.recoveryActions.history.columns.group'), cell: (run) => run.applicationGroup },
    { id: 'status', header: t('pages.recoveryActions.history.columns.status'), cell: (run) => <RecoveryTestStatusBadge status={run.status} label={t(`pages.recoveryActions.status.${run.status}`)} /> },
    { id: 'duration', header: t('pages.recoveryActions.history.columns.duration'), cell: (run) => run.duration, align: 'right' },
  ]

  return (
    <RecoveryActionsPageShell activeTab="history">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><h3 className="text-lg font-semibold text-text-primary">{t('pages.recoveryActions.history.title')}</h3><p className="mt-1 max-w-2xl text-sm text-text-muted">{t('pages.recoveryActions.history.description')}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label={t('pages.recoveryActions.history.period')} htmlFor="history-period"><Select id="history-period" size="sm" value={period} onChange={(event) => { setPeriod(event.target.value) }}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select></Field>
            <FilterTabs ariaLabel={t('pages.recoveryActions.history.filters.ariaLabel')} tabs={[{ value: 'all', label: t('pages.recoveryActions.history.filters.all') }, { value: 'automated', label: t('pages.recoveryActions.history.filters.automated') }, { value: 'manual', label: t('pages.recoveryActions.history.filters.manual') }]} value={filter} onChange={(value) => { setFilter(value as HistoryFilter) }} />
          </div>
        </div>
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><div><CardTitle>{t('pages.recoveryActions.history.tableTitle')}</CardTitle><CardDescription>{t('pages.recoveryActions.history.tableDescription')}</CardDescription></div><Badge color="info" size="sm">{String(rows.length)} {t('pages.recoveryActions.history.records')}</Badge></div>
          <DataTable columns={columns} rows={rows} rowKey={(run) => run.id} ariaLabel={t('pages.recoveryActions.history.tableAriaLabel')} onRowClick={setSelectedRun} rowAriaLabel={(run) => `${run.applicationGroup} ${run.status}`} emptyContent={t('pages.recoveryActions.history.empty')} />
        </Card>
      </div>
      <DetailDrawer open={Boolean(selectedRun)} onClose={() => { setSelectedRun(null) }} eyebrow={t('pages.recoveryActions.history.drawer.eyebrow')} title={selectedRun?.applicationGroup ?? ''} subtitle={selectedRun ? formatDate(selectedRun.startedAt) : undefined} headerExtra={selectedRun ? <RecoveryTestStatusBadge status={selectedRun.status} label={t(`pages.recoveryActions.status.${selectedRun.status}`)} /> : null} ariaLabel={t('pages.recoveryActions.history.drawer.ariaLabel')} closeLabel={t('common.close')}>
        {selectedRun ? <dl className="px-5 py-3"><DetailRow label={t('pages.recoveryActions.history.columns.mode')} value={t(`pages.recoveryActions.history.mode.${selectedRun.mode}`)} /><DetailRow label={t('pages.recoveryActions.history.columns.environment')} value={selectedRun.environment} /><DetailRow label={t('pages.recoveryActions.history.columns.duration')} value={selectedRun.duration} /><DetailRow label={t('pages.recoveryActions.history.columns.checks')} value={`${String(selectedRun.checksPassed)}/${String(selectedRun.checksTotal)}`} /><DetailRow label={t('pages.recoveryActions.history.drawer.summary')} value={selectedRun.summary} /></dl> : null}
      </DetailDrawer>
    </RecoveryActionsPageShell>
  )
}

function formatDate(value: string) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
