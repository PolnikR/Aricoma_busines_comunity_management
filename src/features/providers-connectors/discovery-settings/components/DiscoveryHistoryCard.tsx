import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { LayersIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { DISCOVERY_RETENTION_OPTIONS } from '../model/discoverySettingsTypes'
import type { DiscoveryRetention, DiscoverySettings } from '../model/discoverySettingsTypes'

interface DiscoveryHistoryCardProps {
  settings: DiscoverySettings
  onChange: (patch: Partial<DiscoverySettings>) => void
}

export function DiscoveryHistoryCard({ settings, onChange }: DiscoveryHistoryCardProps) {
  const { t } = useTranslation()
  const retentionLabels: Record<Exclude<DiscoveryRetention, 'custom'>, string> = {
    '7 days': t('pages.discoverySettings.history.retention.7Days'),
    '30 days': t('pages.discoverySettings.history.retention.30Days'),
    '90 days': t('pages.discoverySettings.history.retention.90Days'),
    '180 days': t('pages.discoverySettings.history.retention.180Days'),
    '1 year': t('pages.discoverySettings.history.retention.1Year'),
  }

  return (
    <SettingsSectionCard
      icon={<LayersIcon className="size-5" />}
      title={t('pages.discoverySettings.history.title')}
      description={t('pages.discoverySettings.history.description')}
    >
      <Field label={t('pages.discoverySettings.history.retentionLabel')} htmlFor="discovery-retention">
        <Select
          id="discovery-retention"
          value={settings.retention}
          onChange={event => { onChange({ retention: event.target.value as DiscoverySettings['retention'] }) }}
        >
          {DISCOVERY_RETENTION_OPTIONS.map(retention => (
            <option key={retention} value={retention}>
              {retention === 'custom' ? t('pages.discoverySettings.history.customRetention') : retentionLabels[retention]}
            </option>
          ))}
        </Select>
      </Field>

      {settings.retention === 'custom' ? (
        <div className="mt-3">
          <Field label={t('pages.discoverySettings.history.customRetention')} htmlFor="custom-retention">
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
              <span className="shrink-0 text-xs text-text-muted">{t('pages.discoverySettings.history.days')}</span>
            </div>
          </Field>
        </div>
      ) : null}

      <p className="mt-3 text-xs leading-5 text-text-muted lg:mt-2 lg:leading-4">
        {t('pages.discoverySettings.history.recordsHelper')}
      </p>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 lg:mt-3 lg:px-2.5 lg:py-2 lg:leading-4">
        <span aria-hidden="true" className="mt-0.5 font-semibold">!</span>
        <p>{t('pages.discoverySettings.history.warning')}</p>
      </div>
    </SettingsSectionCard>
  )
}
