import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { CheckIcon, ExecutionIcon } from '@/shared/icons/Icons'
import { RecoveryActionsPageShell } from '../components/RecoveryActionsPageShell'
import { RecoveryPointSummary } from '../components/RecoveryPointSummary'
import { RecoveryTestStatusBadge } from '../components/RecoveryTestStatusBadge'
import {
  latestAutomatedRun,
  latestRecoveryPoint,
  latestValidationChecks,
  recoveryApplicationGroups,
} from '../mocks/recoveryActionsMocks'

type ValidationMode = 'latest' | 'manual'

export function RecoveryActionsValidatePage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ValidationMode>('latest')
  const [groupId, setGroupId] = useState(recoveryApplicationGroups[0].id)
  const [validationDate, setValidationDate] = useState('2026-08-11T04:15')
  const [manualSubmitted, setManualSubmitted] = useState(false)
  const selectedGroup = recoveryApplicationGroups.find((group) => group.id === groupId) ?? recoveryApplicationGroups[0]

  return (
    <RecoveryActionsPageShell activeTab="validate">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{t('pages.recoveryActions.validate.title')}</h3>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">{t('pages.recoveryActions.validate.description')}</p>
          </div>
          <FilterTabs
            ariaLabel={t('pages.recoveryActions.validate.modes.ariaLabel')}
            tabs={[
              { value: 'latest', label: t('pages.recoveryActions.validate.modes.latest') },
              { value: 'manual', label: t('pages.recoveryActions.validate.modes.manual') },
            ]}
            value={mode}
            onChange={(value) => { setMode(value as ValidationMode); setManualSubmitted(false) }}
          />
        </div>

        {mode === 'latest' ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t('pages.recoveryActions.validate.latest.title')}</CardTitle>
                  <CardDescription>{t('pages.recoveryActions.validate.latest.description')}</CardDescription>
                </div>
                <RecoveryTestStatusBadge status={latestAutomatedRun.status} label={t('pages.recoveryActions.status.failed')} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label={t('pages.recoveryActions.validate.latest.applicationGroup')} value={latestAutomatedRun.applicationGroup} />
                <Metric label={t('pages.recoveryActions.validate.latest.started')} value={formatDate(latestAutomatedRun.startedAt)} />
                <Metric label={t('pages.recoveryActions.validate.latest.checks')} value={`${String(latestAutomatedRun.checksPassed)}/${String(latestAutomatedRun.checksTotal)}`} />
              </div>
              <Alert variant="warning" title={t('pages.recoveryActions.validate.latest.issueTitle')} description={latestAutomatedRun.summary} />
            </Card>
            <CheckList />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,1fr)]">
            <Card className="space-y-4">
              <div>
                <CardTitle>{t('pages.recoveryActions.validate.manual.title')}</CardTitle>
                <CardDescription>{t('pages.recoveryActions.validate.manual.description')}</CardDescription>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('pages.recoveryActions.fields.applicationGroup')} htmlFor="validate-group">
                  <Select id="validate-group" value={groupId} onChange={(event) => { setGroupId(event.target.value) }}>
                    {recoveryApplicationGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </Select>
                </Field>
                <Field label={t('pages.recoveryActions.fields.validationDate')} htmlFor="validate-date">
                  <Input id="validate-date" type="datetime-local" value={validationDate} onChange={(event) => { setValidationDate(event.target.value) }} />
                </Field>
              </div>
              <div className="rounded-xl border border-border bg-surface-subtle p-3 text-sm text-text-secondary">
                <p className="font-semibold text-text-primary">{t('pages.recoveryActions.validate.manual.pointInTime')}</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">{t('pages.recoveryActions.validate.manual.pointInTimeDescription')}</p>
                <RecoveryPointSummary
                  className="mt-3"
                  point={{ ...latestRecoveryPoint, configurationAt: `${validationDate}:00+02:00` }}
                  configurationLabel={t('pages.recoveryActions.validate.manual.configuration')}
                  snapshotsLabel={t('pages.recoveryActions.validate.manual.snapshots')}
                />
              </div>
              <button type="button" onClick={() => { setManualSubmitted(true) }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15">
                <ExecutionIcon className="size-4" />
                {t('pages.recoveryActions.validate.manual.run')}
              </button>
            </Card>
            <div className="space-y-4">
              {manualSubmitted ? <Alert variant="success" title={t('pages.recoveryActions.validate.manual.successTitle')} description={t('pages.recoveryActions.validate.manual.successDescription', { group: selectedGroup.name })} /> : null}
              <CheckList />
            </div>
          </div>
        )}
      </div>
    </RecoveryActionsPageShell>
  )
}

function CheckList() {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>{t('pages.recoveryActions.validate.checks.title')}</CardTitle>
          <CardDescription>{t('pages.recoveryActions.validate.checks.description')}</CardDescription>
        </div>
        <Badge color="success" size="sm">{t('pages.recoveryActions.status.ready')}</Badge>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {latestValidationChecks.map((check) => (
          <li key={check.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${check.status === 'warning' ? 'bg-warning-50 text-warning-600' : 'bg-success-50 text-success-600'}`} aria-hidden="true"><CheckIcon className="size-3.5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-text-primary">{check.label}</span><span className="mt-0.5 block text-xs leading-5 text-text-muted">{check.detail}</span></span>
            <span className="shrink-0 text-xs font-medium text-text-muted">{check.status === 'warning' ? t('pages.recoveryActions.status.warning') : t('pages.recoveryActions.status.passed')}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">{label}</p><p className="mt-1 truncate text-sm font-semibold text-text-primary">{value}</p></div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
