import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useInitialResourcePrefetch } from '@/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { OverallVendorFilter } from '../components/overall/OverallVendorFilter'
import { OverallKpis } from '../components/overall/OverallKpis'
import { ProtectionOverview } from '../components/overall/ProtectionOverview'
import { RecoveryOverview } from '../components/overall/RecoveryOverview'
import { InfrastructureOverviewPanel } from '../components/overall/InfrastructureOverviewPanel'
import { DeploymentCoverage } from '../components/overall/DeploymentCoverage'
import { overallPreviewFixture } from '../mocks/overallPreviewFixtures'
import { selectOverallProtection, type StorageVendor } from '../model/overallPreviewMetrics'
import './overview.css'

export function OverviewPage() {
  const { t, language } = useTranslation()
  const [vendor, setVendor] = useState<StorageVendor>('all')
  useInitialResourcePrefetch(true)
  const data = overallPreviewFixture
  const protection = selectOverallProtection(data, vendor)
  const scope = vendor === 'all' ? t('overview.allVendors') : data.vendors.find(item => item.id === vendor)?.name ?? t('overview.allVendors')
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-10-16T00:00:00Z'))

  return <div className="overall-page" aria-label={t('overview.dashboard')}>
    <PageHeader
      variant="compact"
      title={t('nav.overview')}
      description={t('overview.description')}
      actions={<div className="overall-header-actions">
        <span className="overall-date">{date} <b>·</b> {t('overview.demoInventory')}</span>
        <OverallVendorFilter vendor={vendor} onVendorChange={setVendor} />
      </div>}
    />
    <OverallKpis data={data} protection={protection} />
    <div className="overall-panels">
      <ProtectionOverview scope={scope} stats={protection} />
      <RecoveryOverview data={data} />
      <InfrastructureOverviewPanel data={data} />
      <DeploymentCoverage data={data} />
    </div>
  </div>
}
