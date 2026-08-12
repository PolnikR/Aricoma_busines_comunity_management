import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { MonitoringIcon, SettingsIcon } from '@/shared/icons/Icons'
import { RecoveryActionsPageShell } from '../components/RecoveryActionsPageShell'
import {
  initialRecoverySchedule,
  recoveryApplicationGroups,
  recoveryNotificationRecipients,
} from '../mocks/recoveryActionsMocks'
import type { RecoveryScheduleSettings } from '../model/recoveryActionTypes'

export function RecoveryActionsSchedulePage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<RecoveryScheduleSettings>(initialRecoverySchedule)
  const [saved, setSaved] = useState(false)
  const recipient = recoveryNotificationRecipients.find((item) => item.id === settings.recipientId) ?? recoveryNotificationRecipients[0]
  const update = (patch: Partial<RecoveryScheduleSettings>) => { setSettings((current) => ({ ...current, ...patch })); setSaved(false) }

  return (
    <RecoveryActionsPageShell activeTab="schedule">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{t('pages.recoveryActions.schedule.title')}</h3>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">{t('pages.recoveryActions.schedule.description')}</p>
        </div>
        {saved ? <Alert variant="success" title={t('pages.recoveryActions.schedule.savedTitle')} description={t('pages.recoveryActions.schedule.savedDescription')} /> : null}
        <div className="grid gap-4 xl:grid-cols-2">
          <SettingsSectionCard icon={<SettingsIcon className="size-5" />} title={t('pages.recoveryActions.schedule.timingTitle')} description={t('pages.recoveryActions.schedule.timingDescription')}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-text-primary">{t('pages.recoveryActions.schedule.enabled')}</p><p className="mt-1 text-xs leading-5 text-text-muted">{t('pages.recoveryActions.schedule.enabledDescription')}</p></div>
              <Toggle checked={settings.enabled} label={t('pages.recoveryActions.schedule.enabled')} onChange={(enabled) => { update({ enabled }) }} />
            </div>
            <div className="my-5 h-px bg-border" />
            <div className={settings.enabled ? undefined : 'pointer-events-none opacity-60'}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('pages.recoveryActions.schedule.recurrence')} htmlFor="recovery-recurrence">
                  <Select id="recovery-recurrence" value={settings.recurrence} onChange={(event) => { update({ recurrence: event.target.value as RecoveryScheduleSettings['recurrence'] }) }}>
                    <option value="weekly">{t('pages.recoveryActions.schedule.weekly')}</option>
                    <option value="monthly">{t('pages.recoveryActions.schedule.monthly')}</option>
                  </Select>
                </Field>
                <Field label={t('pages.recoveryActions.schedule.day')} htmlFor="recovery-day">
                  <Select id="recovery-day" value={settings.day} onChange={(event) => { update({ day: event.target.value }) }}>
                    {['Monday', 'Wednesday', 'Sunday'].map((day) => <option key={day} value={day}>{day}</option>)}
                  </Select>
                </Field>
                <Field label={t('pages.recoveryActions.schedule.time')} htmlFor="recovery-time">
                  <Select id="recovery-time" value={settings.time} onChange={(event) => { update({ time: event.target.value }) }}>
                    {['20:00', '22:00', '23:30'].map((time) => <option key={time} value={time}>{time}</option>)}
                  </Select>
                </Field>
                <Field label={t('pages.recoveryActions.schedule.timezone')} htmlFor="recovery-timezone">
                  <Select id="recovery-timezone" value={settings.timezone} onChange={(event) => { update({ timezone: event.target.value }) }}>
                    <option>Europe/Bratislava (UTC+02:00)</option><option>UTC</option>
                  </Select>
                </Field>
              </div>
            </div>
          </SettingsSectionCard>
          <SettingsSectionCard icon={<MonitoringIcon className="size-5" />} title={t('pages.recoveryActions.schedule.notificationsTitle')} description={t('pages.recoveryActions.schedule.notificationsDescription')}>
            <Field label={t('pages.recoveryActions.schedule.applicationGroup')} htmlFor="scheduled-group">
              <Select id="scheduled-group" value={settings.applicationGroupId} onChange={(event) => { update({ applicationGroupId: event.target.value }) }}>
                {recoveryApplicationGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </Select>
            </Field>
            <div className="mt-4">
              <Field label={t('pages.recoveryActions.schedule.recipient')} htmlFor="scheduled-recipient">
                <Select id="scheduled-recipient" value={settings.recipientId} onChange={(event) => { update({ recipientId: event.target.value }) }}>
                  {recoveryNotificationRecipients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </Field>
              <p className="mt-2 text-xs leading-5 text-text-muted">{t('pages.recoveryActions.schedule.recipientHelper')}</p>
              {recipient ? <div className="mt-4 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-xs"><p className="font-semibold text-text-primary">{recipient.name}</p><p className="mt-0.5 text-text-muted">{recipient.email}</p></div> : <p className="mt-4 text-xs text-text-muted">{t('messages.noDataAvailable')}</p>}
            </div>
          </SettingsSectionCard>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-text-muted">{t('pages.recoveryActions.schedule.mockNote')}</p><Button size="sm" onClick={() => { setSaved(true) }}>{t('common.save')}</Button></div>
      </div>
    </RecoveryActionsPageShell>
  )
}
