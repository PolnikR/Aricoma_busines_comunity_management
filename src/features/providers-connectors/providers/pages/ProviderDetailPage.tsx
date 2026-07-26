import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { Badge } from '@/shared/components/badge/Badge'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { StatCard } from '@/shared/components/stat-card/StatCard'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { LayersIcon, MonitoringIcon, PlugIcon, SettingsIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { ProviderConnectionsTable } from '../components/ProviderConnectionsTable'
import { getProviderById } from '../model/providerRegistry'
import type { Provider } from '../model/providerRegistry'

const TABS = ['Overview', 'Connections', 'Capabilities', 'Health'] as const
type Tab = (typeof TABS)[number]

function statusColor(status: Provider['status']): 'success' | 'light' {
  return status === 'Active' ? 'success' : 'light'
}

interface MetricCardProps {
  label: string
  value: ReactNode
  helper: string
  icon: ReactNode
}

export function ProviderDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const provider = providerId ? getProviderById(providerId) : undefined
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const goBack = () => { void navigate('/providers-connectors/providers') }

  if (!provider) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow={t('pages.providers.eyebrow')}
          title={t('pages.providers.detail.notFound')}
          description={t('pages.providers.detail.notFoundDesc')}
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">{t('pages.providers.detail.unknown')}</div>
        </div>
      </div>
    )
  }

  const sourceCount = provider.connections.filter((c) => c.role === 'Source').length
  const targetCount = provider.connections.filter((c) => c.role === 'Target').length
  const connectedCount = provider.connections.filter((c) => c.status === 'Connected').length

  const metricItems: MetricCardProps[] = [
    {
      label: t('pages.providers.detail.status'),
      value: <Badge color={statusColor(provider.status)} size="sm">{provider.status}</Badge>,
      helper: provider.status === 'Active' ? t('pages.providers.detail.statusActive') : t('pages.providers.detail.statusInactive'),
      icon: <MonitoringIcon className="size-6" />,
    },
    {
      label: t('pages.providers.detail.version'),
      value: provider.version,
      helper: `${provider.type} ${t('pages.providers.detail.configure').toLowerCase()}`,
      icon: <SettingsIcon className="size-6" />,
    },
    {
      label: t('pages.providers.detail.connections'),
      value: provider.connections.length.toString(),
      helper: `${String(sourceCount)} ${t('pages.providers.detail.source')} · ${String(targetCount)} ${t('pages.providers.detail.target')}`,
      icon: <PlugIcon className="size-6" />,
    },
    {
      label: t('pages.providers.detail.capabilities'),
      value: provider.capabilities.length.toString(),
      helper: provider.capabilities.join(', ') || t('pages.providers.detail.none'),
      icon: <LayersIcon className="size-6" />,
    },
  ]

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.providers.eyebrow')}
        title={provider.name}
        description={`${provider.type} ${t('pages.providers.title').toLowerCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>
            <Button size="sm">{t('pages.providers.detail.configure')}</Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((metric) => (
            <StatCard key={metric.label} {...metric} />
          ))}
        </div>

        <Card className="overflow-hidden p-0 sm:p-0">
          <Tabs
            items={TABS.map((tab) => ({ value: tab, label: tab }))}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Provider detail sections"
          />

          <div className="p-5">
            {activeTab === 'Overview' && (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Provider ID</dt>
                  <dd className="mt-1 font-mono text-sm text-[#17233d]">{provider.id}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Type</dt>
                  <dd className="mt-1 text-sm text-[#17233d]">{provider.type}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Version</dt>
                  <dd className="mt-1 font-mono text-sm text-[#17233d]">{provider.version}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Capabilities</dt>
                  <dd className="mt-1 text-sm text-[#17233d]">{provider.capabilities.join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Connections</dt>
                  <dd className="mt-1 text-sm text-[#17233d]">
                    {provider.connections.length} configured · <span className="font-medium text-[#047857]">{connectedCount} connected</span>
                  </dd>
                </div>
              </dl>
            )}

            {activeTab === 'Connections' && (
              <ProviderConnectionsTable connections={provider.connections} />
            )}

            {activeTab === 'Capabilities' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {provider.capabilities.map((cap) => (
                  <div key={cap} className="flex items-center justify-between gap-3 rounded-2xl border border-[#dbe7f2] bg-[#f8fbfe] p-4">
                    <span className="text-sm font-semibold text-[#17233d]">{cap}</span>
                    <Badge color="success" size="sm">Supported</Badge>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'Health' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-[#dbe7f2] bg-[#f8fbfe] p-4">
                  <span className="text-sm font-medium text-[#52627b]">Connectivity</span>
                  <Badge color={provider.status === 'Active' ? 'success' : 'light'} size="sm">
                    {provider.status === 'Active' ? 'Connected' : 'Unavailable'}
                  </Badge>
                </div>
                <p className="rounded-lg border border-dashed border-[#cfdaea] bg-[#f5f8fc] p-3 text-sm text-[#71819a]">
                  Detailed health checks (certificate expiry, quota, replication lag) arrive in a later release.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
