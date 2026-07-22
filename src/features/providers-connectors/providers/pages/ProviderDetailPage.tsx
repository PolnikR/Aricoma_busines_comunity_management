import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { ProviderConnectionsTable } from '../components/ProviderConnectionsTable'
import { getProviderById } from '../model/providerRegistry'

const TABS = ['Overview', 'Connections', 'Capabilities', 'Health'] as const
type Tab = (typeof TABS)[number]

export function ProviderDetailPage() {
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const provider = providerId ? getProviderById(providerId) : undefined
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const goBack = () => { void navigate('/providers-connectors/providers') }

  if (!provider) {
    return (
      <>
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Provider not found"
          description="The requested provider does not exist."
          actions={<Button variant="outline" onClick={goBack}>Back</Button>}
        />
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">Unknown provider.</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title={provider.name}
        description={`${provider.type} provider`}
        actions={<Button variant="outline" onClick={goBack}>Back</Button>}
      />

      <div className="p-6 space-y-4">
        <Card className="p-5">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">Status</p>
              <p className="mt-1 text-sm font-medium text-[#17233d]">{provider.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">Provider version</p>
              <p className="mt-1 text-sm font-medium text-[#17233d]">{provider.version}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">Connections</p>
              <p className="mt-1 text-sm font-medium text-[#17233d]">{provider.connections.length}</p>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex gap-1 border-b border-[#e3edf6] px-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveTab(tab) }}
                className={`px-4 py-3 text-sm font-medium transition ${activeTab === tab ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#17233d]'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'Overview' && (
              <div className="space-y-2 text-sm text-[#44536c]">
                <p><span className="font-medium text-[#17233d]">Type:</span> {provider.type}</p>
                <p><span className="font-medium text-[#17233d]">Capabilities:</span> {provider.capabilities.join(', ')}</p>
                <p><span className="font-medium text-[#17233d]">Connections:</span> {provider.connections.length}</p>
              </div>
            )}
            {activeTab === 'Connections' && (
              <ProviderConnectionsTable connections={provider.connections} />
            )}
            {activeTab === 'Capabilities' && (
              <ul className="list-disc pl-5 text-sm text-[#44536c] space-y-1">
                {provider.capabilities.map((cap) => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            )}
            {activeTab === 'Health' && (
              <p className="text-sm text-[#44536c]">
                Provider is <span className="font-medium text-[#17233d]">{provider.status}</span>. Detailed health checks are not available in Release 1.
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
