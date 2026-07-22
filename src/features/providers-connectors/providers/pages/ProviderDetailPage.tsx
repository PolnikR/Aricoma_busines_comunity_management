import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { Badge } from '@/shared/components/badge/Badge'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { LayersIcon, MonitoringIcon, PlugIcon, SettingsIcon } from '@/shared/icons/Icons'
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

function MetricCard({ label, value, helper, icon }: MetricCardProps) {
  return (
    <article className="flex min-h-20 items-center gap-3 rounded-[18px] border border-[#dfeaf5] bg-white p-3.5 shadow-[0_12px_28px_-24px_rgba(37,72,112,0.5)]">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf7ff] text-[#118ccc]">
        {icon}
      </div>
      <div className="min-w-0">
        <strong className="block truncate text-lg font-semibold text-[#17233d]">{value}</strong>
        <p className="text-sm font-medium text-[#52627b]">{label}</p>
        <p className="truncate text-[11px] text-[#8a98ad]">{helper}</p>
      </div>
    </article>
  )
}

export function ProviderDetailPage() {
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const provider = providerId ? getProviderById(providerId) : undefined
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const goBack = () => { void navigate('/providers-connectors/providers') }

  if (!provider) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Provider not found"
          description="The requested provider does not exist."
          actions={<Button size="sm" variant="outline" onClick={goBack}>Back</Button>}
        />
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">Unknown provider.</div>
        </div>
      </div>
    )
  }

  const sourceCount = provider.connections.filter((c) => c.role === 'Source').length
  const targetCount = provider.connections.filter((c) => c.role === 'Target').length
  const connectedCount = provider.connections.filter((c) => c.status === 'Connected').length

  const metricItems: MetricCardProps[] = [
    {
      label: 'Status',
      value: <Badge color={statusColor(provider.status)} size="sm">{provider.status}</Badge>,
      helper: provider.status === 'Active' ? 'Enabled & reachable' : 'Not enabled',
      icon: <MonitoringIcon className="size-6" />,
    },
    {
      label: 'Provider version',
      value: provider.version,
      helper: `${provider.type} connector`,
      icon: <SettingsIcon className="size-6" />,
    },
    {
      label: 'Connections',
      value: provider.connections.length.toString(),
      helper: `${String(sourceCount)} source · ${String(targetCount)} target`,
      icon: <PlugIcon className="size-6" />,
    },
    {
      label: 'Capabilities',
      value: provider.capabilities.length.toString(),
      helper: provider.capabilities.join(', ') || 'None',
      icon: <LayersIcon className="size-6" />,
    },
  ]

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Providers & Connectors"
        title={provider.name}
        description={`${provider.type} provider`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goBack}>Back</Button>
            <Button size="sm">Configure</Button>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0">
        <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="flex gap-1 overflow-x-auto border-b border-[#e3edf6] px-3">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab) }}
                aria-current={activeTab === tab}
                className={`whitespace-nowrap px-4 py-3.5 text-sm font-medium transition ${activeTab === tab ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'border-b-2 border-transparent text-[#71819a] hover:text-[#17233d]'}`}
              >
                {tab}
              </button>
            ))}
          </div>

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
