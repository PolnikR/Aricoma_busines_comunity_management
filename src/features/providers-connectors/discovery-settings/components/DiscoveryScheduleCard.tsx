import type { ReactNode } from 'react'
import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Field, Select } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { ExecutionIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from '@/hooks/useTranslation'
import { DISCOVERY_FREQUENCIES } from '../model/discoverySettingsTypes'
import type { DiscoveryFrequency, DiscoveryScheduleSettings } from '../model/discoverySettingsTypes'
import { DISCOVERY_TIMEZONES } from '../mocks/discoverySettingsMocks'

interface DiscoveryScheduleCardProps {
  settings: DiscoveryScheduleSettings
  onChange: (patch: Partial<DiscoveryScheduleSettings>) => void
  footer?: ReactNode
}

export function DiscoveryScheduleCard({ settings, onChange, footer }: DiscoveryScheduleCardProps) {
  const { t } = useTranslation()
  const frequencyLabels: Record<DiscoveryFrequency, string> = {
    '15 minutes': t('pages.discoverySettings.schedule.frequency.15Minutes'),
    '30 minutes': t('pages.discoverySettings.schedule.frequency.30Minutes'),
    '1 hour': t('pages.discoverySettings.schedule.frequency.1Hour'),
    '6 hours': t('pages.discoverySettings.schedule.frequency.6Hours'),
    '12 hours': t('pages.discoverySettings.schedule.frequency.12Hours'),
    '1 day': t('pages.discoverySettings.schedule.frequency.1Day'),
  }

  return (
    <SettingsSectionCard
      icon={<ExecutionIcon className="size-5" />}
      title={t('pages.discoverySettings.schedule.title')}
      description={t('pages.discoverySettings.schedule.description')}
      footer={footer}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-primary lg:text-xs">{t('pages.discoverySettings.schedule.enabledLabel')}</p>
          <p className="mt-1 text-xs leading-5 text-text-muted lg:mt-0.5 lg:leading-4">{t('pages.discoverySettings.schedule.enabledDescription')}</p>
        </div>
        <Toggle
          checked={settings.scheduleEnabled}
          label={t('pages.discoverySettings.schedule.enabledLabel')}
          onChange={scheduleEnabled => { onChange({ scheduleEnabled }) }}
        />
      </div>

      <div className="my-5 h-px bg-border lg:my-3" />

      <div className={cn('grid grid-cols-1 gap-3', !settings.scheduleEnabled && 'opacity-60')}>
        <Field label={t('pages.discoverySettings.schedule.frequency.label')} htmlFor="discovery-frequency">
          <Select
            id="discovery-frequency"
            value={settings.frequency}
            disabled={!settings.scheduleEnabled}
            onChange={event => { onChange({ frequency: event.target.value as DiscoveryScheduleSettings['frequency'] }) }}
          >
            {DISCOVERY_FREQUENCIES.map(frequency => (
              <option key={frequency} value={frequency}>
                {frequencyLabels[frequency]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('pages.discoverySettings.schedule.timezone.label')} htmlFor="discovery-timezone">
          <Select
            id="discovery-timezone"
            value={settings.timezone}
            disabled={!settings.scheduleEnabled}
            onChange={event => { onChange({ timezone: event.target.value }) }}
          >
            {DISCOVERY_TIMEZONES.map(timezone => (
              <option key={timezone} value={timezone}>
                {timezone.startsWith('Europe/') ? timezone.replace('Europe/', '') : timezone}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900 lg:mt-3 lg:px-2.5 lg:py-2 lg:leading-4">
        <span aria-hidden="true" className="mt-0.5 font-semibold">i</span>
        <p>
          {settings.scheduleEnabled
            ? t('pages.discoverySettings.schedule.nextEnabled').replace('{{frequency}}', settings.frequency)
            : t('pages.discoverySettings.schedule.nextDisabled')}
        </p>
      </div>
    </SettingsSectionCard>
  )
}
