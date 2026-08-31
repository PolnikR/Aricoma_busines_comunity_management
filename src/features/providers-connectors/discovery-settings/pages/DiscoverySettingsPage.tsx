import { useState } from 'react'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { SkeletonBlock } from '@/shared/components/data-table'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Input } from '@/shared/components/form/FormControls'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { Tabs } from '@/shared/components/tabs/Tabs'
import type { TabItem } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { SettingsIcon } from '@/shared/icons/Icons'
import { providerTypeLabel } from '../../providers/helpers/providerTypeLabel'
import { DiscoveryHistoryCard } from '../components/DiscoveryHistoryCard'
import { DiscoveryNotificationsCard } from '../components/DiscoveryNotificationsCard'
import { getOrderedDiscoveryCacheDefaultKeys } from '../helpers/discoveryCacheConfigDraft'
import { useDiscoveryCacheConfig } from '../hooks/useDiscoveryCacheConfig'
import { useDiscoveryCacheConfigDraft } from '../hooks/useDiscoveryCacheConfigDraft'
import {
  useDiscoverySettingsSearchParams,
} from '../hooks/useDiscoverySettingsSearchParams'
import type { DiscoverySettingsTab } from '../hooks/useDiscoverySettingsSearchParams'
import { useUpdateDiscoveryCacheConfig } from '../hooks/useUpdateDiscoveryCacheConfig'
import {
  DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS,
  DISCOVERY_NOTIFICATION_RECIPIENTS,
} from '../mocks/discoverySettingsMocks'
import type { DiscoveryNotificationSettings } from '../model/discoverySettingsTypes'

export function DiscoverySettingsPage() {
  const { t } = useTranslation()
  const {
    tab,
    providerId,
    setTab,
    setProviderId,
  } = useDiscoverySettingsSearchParams()
  const [notificationSettings, setNotificationSettings] = useState<DiscoveryNotificationSettings>(DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS)
  const [savedNotificationSettings, setSavedNotificationSettings] = useState<DiscoveryNotificationSettings>(DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS)
  const [notificationStatus, setNotificationStatus] = useState(() => t('pages.discoverySettings.notifications.status.localOnly'))
  const [cacheStatus, setCacheStatus] = useState(() => t('pages.discoverySettings.cache.status.noChanges'))
  const cacheQuery = useDiscoveryCacheConfig({ enabled: tab === 'configuration' })
  const updateCacheConfig = useUpdateDiscoveryCacheConfig()
  const cacheDraft = useDiscoveryCacheConfigDraft(cacheQuery.data)
  const isNotificationDirty = JSON.stringify(notificationSettings) !== JSON.stringify(savedNotificationSettings)
  const canSaveCache = cacheDraft.isDirty
    && cacheDraft.validation?.isValid === true
    && cacheDraft.patch !== null
    && !updateCacheConfig.isPending
  const tabItems: readonly TabItem<DiscoverySettingsTab>[] = [
    { value: 'configuration', label: t('pages.discoverySettings.tabs.configuration') },
    { value: 'history', label: t('pages.discoverySettings.tabs.history') },
    { value: 'notifications', label: t('pages.discoverySettings.tabs.notifications') },
  ]
  const sectionHeader = {
    configuration: {
      title: t('pages.discoverySettings.cache.title'),
      description: t('pages.discoverySettings.cache.description'),
    },
    history: {
      title: t('pages.discoverySettings.history.title'),
      description: t('pages.discoverySettings.history.description'),
    },
    notifications: {
      title: t('pages.discoverySettings.notifications.title'),
      description: t('pages.discoverySettings.notifications.description'),
    },
  }[tab]
  const tabs = (
    <Tabs
      items={tabItems}
      value={tab}
      onChange={setTab}
      ariaLabel={t('pages.discoverySettings.tabs.ariaLabel')}
      indicator="inset"
      compact
      className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"
    />
  )

  const updateNotificationSettings = (patch: Partial<DiscoveryNotificationSettings>) => {
    setNotificationSettings(current => ({ ...current, ...patch }))
    setNotificationStatus(t('pages.discoverySettings.notifications.status.unsaved'))
  }

  const saveNotifications = () => {
    setSavedNotificationSettings(notificationSettings)
    setNotificationStatus(t('pages.discoverySettings.notifications.status.saved'))
  }

  const cancelNotifications = () => {
    setNotificationSettings(savedNotificationSettings)
    setNotificationStatus(t('pages.discoverySettings.notifications.status.discarded'))
  }

  const prepareTestNotification = () => {
    const recipient = DISCOVERY_NOTIFICATION_RECIPIENTS.find(item => item.id === notificationSettings.recipientId)
    if (!recipient) return
    setNotificationStatus(t('pages.discoverySettings.status.testNotificationPrepared', { email: recipient.email }))
  }

  const markCacheChanged = () => {
    updateCacheConfig.reset()
    setCacheStatus(t('pages.discoverySettings.cache.status.unsaved'))
  }

  const saveCache = () => {
    if (!cacheDraft.patch) return
    updateCacheConfig.mutate(cacheDraft.patch, {
      onSuccess: config => {
        cacheDraft.adopt(config)
        setCacheStatus(t('pages.discoverySettings.cache.status.saved'))
      },
    })
  }

  const cancelCache = () => {
    cacheDraft.cancel()
    updateCacheConfig.reset()
    setCacheStatus(t('pages.discoverySettings.cache.status.discarded'))
  }

  const cacheFooter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted" role="status" aria-live="polite">{cacheStatus}</p>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={cancelCache}
          disabled={!cacheDraft.isDirty || updateCacheConfig.isPending}
        >
          {t('pages.discoverySettings.cache.actions.cancel')}
        </Button>
        <Button size="sm" variant="primary" onClick={saveCache} disabled={!canSaveCache}>
          {updateCacheConfig.isPending
            ? t('pages.discoverySettings.cache.actions.saving')
            : t('pages.discoverySettings.cache.actions.save')}
        </Button>
      </div>
    </div>
  )

  const notificationsFooter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-text-muted" role="status" aria-live="polite">{notificationStatus}</p>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={cancelNotifications} disabled={!isNotificationDirty}>
          {t('pages.discoverySettings.notifications.actions.cancel')}
        </Button>
        <Button size="sm" variant="primary" onClick={saveNotifications} disabled={!isNotificationDirty}>
          {t('pages.discoverySettings.notifications.actions.save')}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <PageHeader
        eyebrow={t('pages.discoverySettings.eyebrow')}
        title={t('pages.discoverySettings.title')}
        description={t('pages.discoverySettings.description')}
      />

      <InventoryShell
        inventoryTitle={sectionHeader.title}
        inventoryDescription={sectionHeader.description}
        tabs={tabs}
      >
        <div className={`min-h-0 flex-1 ${tab === 'history' ? 'overflow-hidden' : 'custom-scrollbar overflow-y-auto'}`}>
        {tab === 'configuration' ? (
          <div role="tabpanel" aria-label={t('pages.discoverySettings.tabs.configuration')}>
            <SettingsSectionCard
              icon={<SettingsIcon className="size-5" />}
              title={t('pages.discoverySettings.cache.title')}
              description={t('pages.discoverySettings.cache.description')}
              footer={cacheFooter}
              showHeader={false}
            >
              {cacheDraft.draft === undefined && cacheQuery.error ? (
                <FetchErrorAlert
                  title={t('pages.discoverySettings.cache.loadFailed')}
                  description={resolveUserFacingErrorMessage(
                    cacheQuery.error,
                    t('pages.discoverySettings.cache.loadFailedDescription'),
                  )}
                  retryLabel={t('pages.discoverySettings.cache.actions.retry')}
                  isRetrying={cacheQuery.isFetching}
                  onRetry={() => { void cacheQuery.refetch() }}
                />
              ) : cacheDraft.draft === undefined ? (
                <div
                  className="space-y-5"
                  role="status"
                  aria-busy="true"
                  aria-label={t('pages.discoverySettings.cache.loading')}
                >
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-28" />
                    <SkeletonBlock className="h-10 w-full rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <SkeletonBlock className="h-3 w-36" />
                    <SkeletonBlock className="h-10 w-full rounded-xl" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SkeletonBlock className="h-10 w-full rounded-xl" />
                    <SkeletonBlock className="h-10 w-full rounded-xl" />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {cacheQuery.error ? (
                    <FetchErrorAlert
                      title={t('pages.discoverySettings.cache.loadFailed')}
                      description={resolveUserFacingErrorMessage(
                        cacheQuery.error,
                        t('pages.discoverySettings.cache.loadFailedDescription'),
                      )}
                      retryLabel={t('pages.discoverySettings.cache.actions.retry')}
                      isRetrying={cacheQuery.isFetching}
                      onRetry={() => { void cacheQuery.refetch() }}
                    />
                  ) : null}

                  {updateCacheConfig.error ? (
                    <Alert
                      variant="error"
                      title={t('pages.discoverySettings.cache.saveFailed')}
                      description={resolveUserFacingErrorMessage(
                        updateCacheConfig.error,
                        t('pages.discoverySettings.cache.saveFailedDescription'),
                      )}
                    />
                  ) : null}

                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t('pages.discoverySettings.cache.defaults.title')}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      {t('pages.discoverySettings.cache.defaults.description')}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {getOrderedDiscoveryCacheDefaultKeys(cacheDraft.draft.defaults).map((key, index) => {
                        const id = `discovery-cache-default-${String(index)}`
                        const error = cacheDraft.validation?.errors.defaults[key]
                        const errorId = `${id}-error`
                        return (
                          <div key={key}>
                            <Field
                              label={t('pages.discoverySettings.cache.defaults.label', { provider: providerTypeLabel(key) })}
                              htmlFor={id}
                            >
                              <Input
                                id={id}
                                value={cacheDraft.draft?.defaults[key] ?? ''}
                                inputMode="numeric"
                                autoComplete="off"
                                invalid={Boolean(error)}
                                aria-describedby={error ? errorId : undefined}
                                onChange={event => {
                                  cacheDraft.setDefault(key, event.target.value)
                                  markCacheChanged()
                                }}
                              />
                            </Field>
                            {error ? (
                              <p id={errorId} className="mt-1 text-xs text-error-600">
                                {t('forms.cacheRefreshSecondsInvalid')}
                              </p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t border-border pt-5">
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t('pages.discoverySettings.cache.retention.title')}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">
                      {t('pages.discoverySettings.cache.retention.description')}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <Field
                          label={t('pages.discoverySettings.cache.retention.days')}
                          htmlFor="discovery-cache-retention-days"
                        >
                          <Input
                            id="discovery-cache-retention-days"
                            value={cacheDraft.draft.historyRetention.retentionDays}
                            inputMode="numeric"
                            autoComplete="off"
                            invalid={Boolean(cacheDraft.validation?.errors.historyRetention.retentionDays)}
                            aria-describedby={cacheDraft.validation?.errors.historyRetention.retentionDays
                              ? 'discovery-cache-retention-days-error'
                              : undefined}
                            onChange={event => {
                              cacheDraft.setRetentionDays(event.target.value)
                              markCacheChanged()
                            }}
                          />
                        </Field>
                        {cacheDraft.validation?.errors.historyRetention.retentionDays ? (
                          <p id="discovery-cache-retention-days-error" className="mt-1 text-xs text-error-600">
                            {t('forms.cacheRefreshSecondsInvalid')}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <Field
                          label={t('pages.discoverySettings.cache.retention.maxRecords')}
                          htmlFor="discovery-cache-max-records"
                        >
                          <Input
                            id="discovery-cache-max-records"
                            value={cacheDraft.draft.historyRetention.maxRecords}
                            inputMode="numeric"
                            autoComplete="off"
                            invalid={Boolean(cacheDraft.validation?.errors.historyRetention.maxRecords)}
                            aria-describedby={cacheDraft.validation?.errors.historyRetention.maxRecords
                              ? 'discovery-cache-max-records-error'
                              : undefined}
                            onChange={event => {
                              cacheDraft.setMaxRecords(event.target.value)
                              markCacheChanged()
                            }}
                          />
                        </Field>
                        {cacheDraft.validation?.errors.historyRetention.maxRecords ? (
                          <p id="discovery-cache-max-records-error" className="mt-1 text-xs text-error-600">
                            {t('forms.cacheRefreshSecondsInvalid')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SettingsSectionCard>
          </div>
        ) : null}

        {tab === 'history' ? (
          <div role="tabpanel" aria-label={t('pages.discoverySettings.tabs.history')} className="h-full min-h-0">
            <DiscoveryHistoryCard
              providerId={providerId}
              onProviderIdChange={setProviderId}
            />
          </div>
        ) : null}

        {tab === 'notifications' ? (
          <div role="tabpanel" aria-label={t('pages.discoverySettings.tabs.notifications')} className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            <DiscoveryNotificationsCard
              settings={notificationSettings}
              recipients={DISCOVERY_NOTIFICATION_RECIPIENTS}
              onChange={updateNotificationSettings}
              onTestNotification={prepareTestNotification}
              footer={notificationsFooter}
              showHeader={false}
            />
            <Card className="space-y-2">
              <CardTitle>{t('pages.discoverySettings.notifications.localOnly.title')}</CardTitle>
              <CardDescription>{t('pages.discoverySettings.notifications.localOnly.description')}</CardDescription>
            </Card>
          </div>
        ) : null}
        </div>
      </InventoryShell>
    </div>
  )
}
