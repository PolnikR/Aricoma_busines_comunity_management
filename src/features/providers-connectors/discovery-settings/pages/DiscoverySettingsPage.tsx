import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { DiscoveryHistoryCard } from '../components/DiscoveryHistoryCard'
import { DiscoveryNotificationsCard } from '../components/DiscoveryNotificationsCard'
import { DiscoveryScheduleCard } from '../components/DiscoveryScheduleCard'
import {
  DEFAULT_DISCOVERY_SETTINGS,
  DISCOVERY_NOTIFICATION_RECIPIENTS,
} from '../mocks/discoverySettingsMocks'
import type { DiscoverySettings } from '../model/discoverySettingsTypes'

export function DiscoverySettingsPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<DiscoverySettings>(DEFAULT_DISCOVERY_SETTINGS)
  const [savedSettings, setSavedSettings] = useState<DiscoverySettings>(DEFAULT_DISCOVERY_SETTINGS)
  const [statusMessage, setStatusMessage] = useState(() => t('pages.discoverySettings.status.noChanges'))
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings)

  const updateSettings = (patch: Partial<DiscoverySettings>) => {
    setSettings(current => ({ ...current, ...patch }))
    setStatusMessage(t('pages.discoverySettings.status.unsaved'))
  }

  const handleSave = () => {
    setSavedSettings(settings)
    setStatusMessage(t('pages.discoverySettings.status.savedLocally'))
  }

  const handleCancel = () => {
    setSettings(savedSettings)
    setStatusMessage(t('pages.discoverySettings.status.discarded'))
  }

  const handleTestNotification = () => {
    const recipient = DISCOVERY_NOTIFICATION_RECIPIENTS.find(user => user.id === settings.recipientId)
    if (recipient) {
      setStatusMessage(t('pages.discoverySettings.status.testNotificationPrepared').replace('{{email}}', recipient.email))
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.discoverySettings.eyebrow')}
        title={t('pages.discoverySettings.title')}
        description={t('pages.discoverySettings.description')}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:p-3">
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto lg:grid-cols-3 lg:overflow-hidden">
          <DiscoveryScheduleCard settings={settings} onChange={updateSettings} />
          <DiscoveryHistoryCard settings={settings} onChange={updateSettings} />
          <DiscoveryNotificationsCard
            settings={settings}
            recipients={DISCOVERY_NOTIFICATION_RECIPIENTS}
            onChange={updateSettings}
            onTestNotification={handleTestNotification}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-muted" role="status" aria-live="polite">{statusMessage}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={!isDirty}>{t('pages.discoverySettings.actions.cancel')}</Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={!isDirty}>{t('pages.discoverySettings.actions.save')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
