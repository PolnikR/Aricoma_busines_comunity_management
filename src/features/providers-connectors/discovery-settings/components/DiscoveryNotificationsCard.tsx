import type { ReactNode } from 'react'
import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Field, Select } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { Button } from '@/shared/components/button/Button'
import { MonitoringIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  DiscoveryNotificationRecipient,
  DiscoveryNotificationSettings,
} from '../model/discoverySettingsTypes'

interface DiscoveryNotificationsCardProps {
  settings: DiscoveryNotificationSettings
  recipients: DiscoveryNotificationRecipient[]
  onChange: (patch: Partial<DiscoveryNotificationSettings>) => void
  onTestNotification: () => void
  footer?: ReactNode
}

export function DiscoveryNotificationsCard({
  settings,
  recipients,
  onChange,
  onTestNotification,
  footer,
}: DiscoveryNotificationsCardProps) {
  const { t } = useTranslation()
  const selectedRecipient = recipients.find(recipient => recipient.id === settings.recipientId) ?? recipients[0]

  return (
    <SettingsSectionCard
      icon={<MonitoringIcon className="size-5" />}
      title={t('pages.discoverySettings.notifications.title')}
      description={t('pages.discoverySettings.notifications.description')}
      footer={footer}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-text-primary lg:text-xs">{t('pages.discoverySettings.notifications.enabledLabel')}</p>
          <p className="mt-1 text-xs leading-5 text-text-muted lg:mt-0.5 lg:leading-4">{t('pages.discoverySettings.notifications.enabledDescription')}</p>
        </div>
        <Toggle
          checked={settings.notificationsEnabled}
          label={t('pages.discoverySettings.notifications.title')}
          onChange={notificationsEnabled => { onChange({ notificationsEnabled }) }}
        />
      </div>

      <div className="my-5 h-px bg-border lg:my-3" />

      <div className={cn(!settings.notificationsEnabled && 'opacity-60')}>
        <Field label={t('pages.discoverySettings.notifications.recipientLabel')} htmlFor="notification-recipient">
          <Select
            id="notification-recipient"
            value={settings.recipientId}
            disabled={!settings.notificationsEnabled}
            onChange={event => { onChange({ recipientId: event.target.value }) }}
          >
            {recipients.map(recipient => (
              <option key={recipient.id} value={recipient.id}>{recipient.name}</option>
            ))}
          </Select>
        </Field>
        <p className="mt-2 text-xs leading-5 text-text-muted lg:mt-1.5 lg:leading-4">{t('pages.discoverySettings.notifications.recipientHelper')}</p>

        {selectedRecipient ? (
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 lg:mt-3 lg:gap-2 lg:px-2 lg:py-2" aria-live="polite">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent" aria-hidden="true">
              {selectedRecipient.name.split(' ').map(part => part[0]).slice(0, 2).join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-text-primary">{selectedRecipient.name}</p>
              <p className="truncate text-[11px] text-text-muted">{selectedRecipient.email}</p>
            </div>
            <Button
              size="xs"
              variant="outline"
              className="ml-auto shrink-0"
              disabled={!settings.notificationsEnabled}
              onClick={onTestNotification}
            >
              {t('pages.discoverySettings.notifications.sendTest')}
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsSectionCard>
  )
}
