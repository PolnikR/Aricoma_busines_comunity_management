import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
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
  const { t } = useTranslation()
  const [vendor, setVendor] = useState<StorageVendor>('all')
  useInitialResourcePrefetch(true)
  const data = overallPreviewFixture
  const protection = selectOverallProtection(data, vendor)
  const scope = vendor === 'all' ? t('overview.allVendors') : data.vendors.find(item => item.id === vendor)?.name ?? t('overview.allVendors')

  return <div className="overall-page" aria-label={t('overview.dashboard')}>
    <OverallToolbar vendor={vendor} onVendorChange={setVendor} />
    <OverallKpis data={data} protection={protection} />
    <div className="overall-panels">
      <ProtectionOverview scope={scope} stats={protection} />
      <RecoveryOverview data={data} />
      <InfrastructureOverviewPanel data={data} />
      <DeploymentCoverage data={data} />
    </div>
    <footer className="overall-footer"><span><b>ABCO</b> {t('overview.tagline')}</span><span>{t('overview.demoData')}</span></footer>
  </div>
}
