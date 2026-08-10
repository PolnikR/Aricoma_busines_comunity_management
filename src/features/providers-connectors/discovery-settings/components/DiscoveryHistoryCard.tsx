import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { LayersIcon } from '@/shared/icons/Icons'
import { DISCOVERY_RETENTION_OPTIONS } from '../model/discoverySettingsTypes'
import type { DiscoverySettings } from '../model/discoverySettingsTypes'

interface DiscoveryHistoryCardProps {
  settings: DiscoverySettings
  onChange: (patch: Partial<DiscoverySettings>) => void
}

export function DiscoveryHistoryCard({ settings, onChange }: DiscoveryHistoryCardProps) {
  return (
    <SettingsSectionCard
      icon={<LayersIcon className="size-5" />}
      title="Discovery history"
      description="Set how long completed and failed records are retained."
    >
      <Field label="History retention" htmlFor="discovery-retention">
        <Select
          id="discovery-retention"
          value={settings.retention}
          onChange={event => { onChange({ retention: event.target.value as DiscoverySettings['retention'] }) }}
        >
          {DISCOVERY_RETENTION_OPTIONS.map(retention => (
            <option key={retention} value={retention}>
              {retention === 'custom' ? 'Custom retention' : retention}
            </option>
          ))}
        </Select>
      </Field>

      {settings.retention === 'custom' ? (
        <div className="mt-3">
          <Field label="Custom retention" htmlFor="custom-retention">
            <div className="flex items-center gap-2">
              <Input
                id="custom-retention"
                type="number"
                min={1}
                max={3650}
                value={settings.customRetentionDays}
                onChange={event => { onChange({ customRetentionDays: Number(event.target.value) }) }}
                className="text-right tabular-nums"
              />
              <span className="shrink-0 text-xs text-text-muted">days</span>
            </div>
          </Field>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-text-muted lg:mt-2 lg:leading-4">
        Records older than the selected period are removed automatically.
      </p>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 lg:mt-3 lg:px-2.5 lg:py-2 lg:leading-4">
        <span aria-hidden="true" className="mt-0.5 font-semibold">!</span>
        <p>Shorter retention reduces storage use but limits troubleshooting history.</p>
      </div>
    </SettingsSectionCard>
  )
}
