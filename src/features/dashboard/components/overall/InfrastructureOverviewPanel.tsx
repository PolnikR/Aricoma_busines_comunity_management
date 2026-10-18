import type { OverallPreviewData } from '../../model/overallPreviewMetrics'
import { OverallPanel } from './OverallPanel'

export function InfrastructureOverviewPanel({ data }: { data: OverallPreviewData }) {
  return <OverallPanel title="Infrastructure Overview" subtitle="Registered providers across compute and storage" className="overall-infrastructure">
    <div className="overall-infrastructure-grid">
      {data.providers.map(provider => {
        const healthy = provider.available === provider.total
        return <article className="overall-resource" key={provider.id}>
          <div className="overall-resource-top">
            <span className={`overall-resource-symbol ${provider.id}`}>{provider.symbol}</span>
            <span className="overall-resource-name"><strong>{provider.name}</strong><small>{provider.kind}</small></span>
            <span className={`overall-resource-status ${healthy ? 'good' : 'warn'}`}>{healthy ? 'Available' : 'Attention'}</span>
          </div>
          <div className="overall-resource-count"><span><strong>{provider.total}</strong> providers</span><small>{provider.available}/{provider.total} available</small></div>
          <div className="overall-resource-meter" role="img" aria-label={`${provider.name}: ${String(provider.available)} of ${String(provider.total)} available (simulated)`}>
            {Array.from({ length: provider.total }, (_, index) => <span key={index} className={index < provider.available ? 'available' : 'offline'} />)}
          </div>
        </article>
      })}
    </div>
  </OverallPanel>
}
