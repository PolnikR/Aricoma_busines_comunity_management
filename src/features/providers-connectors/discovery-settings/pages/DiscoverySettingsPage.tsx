import { useState } from 'react'
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
  const [settings, setSettings] = useState<DiscoverySettings>(DEFAULT_DISCOVERY_SETTINGS)
  const [savedSettings, setSavedSettings] = useState<DiscoverySettings>(DEFAULT_DISCOVERY_SETTINGS)
  const [statusMessage, setStatusMessage] = useState('No unsaved changes.')
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings)

  const updateSettings = (patch: Partial<DiscoverySettings>) => {
    setSettings(current => ({ ...current, ...patch }))
    setStatusMessage('Unsaved changes.')
  }

  const handleSave = () => {
    setSavedSettings(settings)
    setStatusMessage('Discovery settings saved locally.')
  }

  const handleCancel = () => {
    setSettings(savedSettings)
    setStatusMessage('Changes discarded.')
  }

  const handleTestNotification = () => {
    const recipient = DISCOVERY_NOTIFICATION_RECIPIENTS.find(user => user.id === settings.recipientId)
    if (recipient) setStatusMessage(`Test notification prepared for ${recipient.email}.`)
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Discovery settings"
        description="Configure the discovery schedule, history retention, and failure notifications."
        actions={(
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            UI template
          </span>
        )}
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
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={!isDirty}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={handleSave} disabled={!isDirty}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
