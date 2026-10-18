import { useState } from 'react'
import { useInitialResourcePrefetch } from '@/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch'
import { OverallToolbar } from '../components/overall/OverallToolbar'
import { OverallKpis } from '../components/overall/OverallKpis'
import { ProtectionOverview } from '../components/overall/ProtectionOverview'
import { RecoveryOverview } from '../components/overall/RecoveryOverview'
import { InfrastructureOverviewPanel } from '../components/overall/InfrastructureOverviewPanel'
import { DeploymentCoverage } from '../components/overall/DeploymentCoverage'
import { overallPreviewFixture } from '../mocks/overallPreviewFixtures'
import { selectOverallProtection, type StorageVendor } from '../model/overallPreviewMetrics'
import './overview.css'

export function OverviewPage() {
  const [vendor, setVendor] = useState<StorageVendor>('all')
  useInitialResourcePrefetch(true)
  const data = overallPreviewFixture
  const protection = selectOverallProtection(data, vendor)
  const scope = vendor === 'all' ? 'all storage vendors' : data.vendors.find(item => item.id === vendor)?.name ?? 'all storage vendors'

  return <div className="overall-page" aria-label="Overall dashboard">
    <OverallToolbar vendor={vendor} onVendorChange={setVendor} />
    <OverallKpis data={data} protection={protection} />
    <div className="overall-panels">
      <ProtectionOverview scope={scope} stats={protection} />
      <RecoveryOverview data={data} />
      <InfrastructureOverviewPanel data={data} />
      <DeploymentCoverage data={data} />
    </div>
    <footer className="overall-footer"><span><b>ABCO</b> Business continuity, in focus.</span><span>STATIC PREVIEW · DEMO DATA</span></footer>
  </div>
}
