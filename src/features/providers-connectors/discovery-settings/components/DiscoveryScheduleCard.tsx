import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Field, Select } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { ExecutionIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { DISCOVERY_FREQUENCIES } from '../model/discoverySettingsTypes'
import type { DiscoverySettings } from '../model/discoverySettingsTypes'
import { DISCOVERY_TIMEZONES } from '../mocks/discoverySettingsMocks'

interface DiscoveryScheduleCardProps {
  settings: DiscoverySettings
  onChange: (patch: Partial<DiscoverySettings>) => void
}

export function DiscoveryScheduleCard({ settings, onChange }: DiscoveryScheduleCardProps) {
  return (
    <SettingsSectionCard
      icon={<ExecutionIcon className="size-5" />}
      title="Discovery schedule"
      description="Choose when automated discovery should run."
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-primary lg:text-xs">Scheduled discovery</p>
          <p className="mt-1 text-xs leading-5 text-text-muted lg:mt-0.5 lg:leading-4">Run discovery automatically using the interval below.</p>
        </div>
        <Toggle
          checked={settings.scheduleEnabled}
          label="Scheduled discovery"
          onChange={scheduleEnabled => { onChange({ scheduleEnabled }) }}
        />
      </div>

      <div className="my-5 h-px bg-border lg:my-3" />

      <div className={cn('grid grid-cols-1 gap-3', !settings.scheduleEnabled && 'opacity-60')}>
        <Field label="Discovery frequency" htmlFor="discovery-frequency">
          <Select
            id="discovery-frequency"
            value={settings.frequency}
            disabled={!settings.scheduleEnabled}
            onChange={event => { onChange({ frequency: event.target.value as DiscoverySettings['frequency'] }) }}
          >
            {DISCOVERY_FREQUENCIES.map(frequency => (
              <option key={frequency} value={frequency}>
                {frequency === '1 day' ? 'Once a day' : `Every ${frequency}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Discovery timezone" htmlFor="discovery-timezone">
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
            ? `Next discovery uses the selected ${settings.frequency} interval.`
            : 'Scheduled discovery is disabled. Discovery can still be started manually.'}
        </p>
      </div>
    </SettingsSectionCard>
  )
}
