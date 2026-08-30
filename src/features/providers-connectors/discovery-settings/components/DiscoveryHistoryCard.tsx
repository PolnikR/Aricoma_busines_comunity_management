import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { LayersIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'

export function DiscoveryHistoryCard() {
  const { t } = useTranslation()

  return (
    <SettingsSectionCard
      icon={<LayersIcon className="size-5" />}
      title={t('pages.discoverySettings.history.title')}
      description={t('pages.discoverySettings.history.description')}
    >
      <p className="text-xs leading-5 text-text-muted lg:leading-4">
        {t('pages.discoverySettings.history.recordsHelper')}
      </p>
      <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 lg:mt-3 lg:px-2.5 lg:py-2 lg:leading-4">
        <span aria-hidden="true" className="mt-0.5 font-semibold">!</span>
        <p>{t('pages.discoverySettings.history.warning')}</p>
      </div>
    </SettingsSectionCard>
  )
}
