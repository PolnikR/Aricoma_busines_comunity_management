import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { ExecutionIcon } from '@/shared/icons/Icons'
import { RecoveryActionsPageShell } from '../components/RecoveryActionsPageShell'
import { RecoveryPointSummary } from '../components/RecoveryPointSummary'
import { latestRecoveryPoint, recoveryApplicationGroups } from '../mocks/recoveryActionsMocks'

export function RecoveryActionsExecutePage() {
  const { t } = useTranslation()
  const [groupId, setGroupId] = useState(recoveryApplicationGroups[0].id)
  const [recoveryDate, setRecoveryDate] = useState('2026-08-11T04:15')
  const [target, setTarget] = useState('isolated-validation')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const selectedGroup = recoveryApplicationGroups.find((group) => group.id === groupId) ?? recoveryApplicationGroups[0]

  return (
    <RecoveryActionsPageShell activeTab="execute">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{t('pages.recoveryActions.execute.title')}</h3>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">{t('pages.recoveryActions.execute.description')}</p>
        </div>
        {started ? <Alert variant="success" title={t('pages.recoveryActions.execute.startedTitle')} description={t('pages.recoveryActions.execute.startedDescription')} /> : null}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <Card className="space-y-4">
            <div>
              <CardTitle>{t('pages.recoveryActions.execute.formTitle')}</CardTitle>
              <CardDescription>{t('pages.recoveryActions.execute.formDescription')}</CardDescription>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('pages.recoveryActions.fields.applicationGroup')} htmlFor="execute-group">
                <Select id="execute-group" value={groupId} onChange={(event) => { setGroupId(event.target.value) }}>
                  {recoveryApplicationGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </Select>
              </Field>
              <Field label={t('pages.recoveryActions.fields.targetEnvironment')} htmlFor="execute-target">
                <Select id="execute-target" value={target} onChange={(event) => { setTarget(event.target.value) }}>
                  <option value="isolated-validation">Isolated validation</option>
                  <option value="dr-site">DR site</option>
                </Select>
              </Field>
            </div>
            <Field label={t('pages.recoveryActions.fields.recoveryDate')} htmlFor="execute-date">
              <Input id="execute-date" type="datetime-local" value={recoveryDate} onChange={(event) => { setRecoveryDate(event.target.value) }} />
            </Field>
            <p className="text-xs leading-5 text-text-muted">{t('pages.recoveryActions.execute.dateHelper')}</p>
            <Button startIcon={<ExecutionIcon className="size-4" />} onClick={() => { setConfirmOpen(true) }}>{t('pages.recoveryActions.execute.run')}</Button>
          </Card>
          <Card className="space-y-4 bg-surface-subtle">
            <div className="flex items-start justify-between gap-3">
              <div><CardTitle>{t('pages.recoveryActions.execute.previewTitle')}</CardTitle><CardDescription>{t('pages.recoveryActions.execute.previewDescription')}</CardDescription></div>
              <Badge color="info" size="sm">{t('pages.recoveryActions.execute.previewBadge')}</Badge>
            </div>
            <dl className="divide-y divide-border rounded-xl border border-border bg-surface">
              <PreviewRow label={t('pages.recoveryActions.execute.previewGroup')} value={selectedGroup.name} />
              <PreviewRow label={t('pages.recoveryActions.execute.previewTarget')} value={target === 'dr-site' ? 'DR site' : 'Isolated validation'} />
            </dl>
            <RecoveryPointSummary
              point={{ ...latestRecoveryPoint, configurationAt: `${recoveryDate}:00+02:00` }}
              configurationLabel={t('pages.recoveryActions.execute.previewConfiguration')}
              snapshotsLabel={t('pages.recoveryActions.execute.previewSnapshots')}
            />
            <Alert variant="info" title={t('pages.recoveryActions.execute.previewNotice')} description={t('pages.recoveryActions.execute.previewNoticeDescription')} />
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={t('pages.recoveryActions.execute.confirmTitle')}
        message={t('pages.recoveryActions.execute.confirmDescription', { group: selectedGroup.name, date: recoveryDate.replace('T', ' ') })}
        confirmLabel={t('pages.recoveryActions.execute.confirm')}
        cancelLabel={t('common.cancel')}
        onCancel={() => { setConfirmOpen(false) }}
        onConfirm={() => { setConfirmOpen(false); setStarted(true) }}
      />
    </RecoveryActionsPageShell>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 px-3 py-3 text-sm"><dt className="text-text-muted">{label}</dt><dd className="truncate text-right font-medium text-text-primary">{value}</dd></div>
}
