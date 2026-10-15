import { LayersIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardRecoveryApplication, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RecoveryApplicationsDonut({ applications, state }: { applications: DashboardRecoveryApplication[] | undefined; state: DashboardState }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  const percent = (count: number, total: number) => new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(total ? count / total : 0)
  const total = applications?.length ?? 0
  const vmware = applications?.filter(application => application.platform === 'VMWARE').length ?? 0
  const power = applications?.filter(application => application.platform === 'IBM_POWER').length ?? 0
  const deployed = applications?.filter(application => application.deployed).length ?? 0

  return <DashboardPanel title={t('dashboard.applications')} subtitle={t('dashboard.applicationsSubtitle')} icon={<LayersIcon className="icon" />}>
    {state === 'loading' || state === 'unknown' || total === 0
      ? <DashboardStatePlaceholder state={state === 'demo' || state === 'partial' ? 'empty' : state} />
      : <div className="recovery-chart-with-stats">
          <div className="topology-content">
            <div className="donut" role="img" aria-label={t('dashboard.applicationsLabel', { total, vmware, power, vmwarePercent: percent(vmware, total), powerPercent: percent(power, total) })} style={{ background: `conic-gradient(var(--app-accent) 0% ${String(vmware / total * 100)}%,var(--app-text-primary) ${String(vmware / total * 100)}% 100%)` }}>
              <div className="donut-center"><strong>{number.format(total)}</strong><span>{t('dashboard.applicationDonutLabel')}</span></div>
            </div>
            <div className="donut-key">
              {[{ key: 'appVmware', value: vmware }, { key: 'appPower', value: power }].map(part => <div className="key-row" key={part.key}>
                <i className={`key-dot${part.key === 'appPower' ? ' navy' : ''}`} />
                <span className="key-name">{t(`dashboard.${part.key}`)}</span>
                <span className="key-count">{number.format(part.value)}</span>
                <span className="key-percent">{percent(part.value, total)}</span>
              </div>)}
            </div>
          </div>
          <div className="recovery-chart-stats">
            <div><strong>{number.format(deployed)}</strong><span>{t('dashboard.deployedApplications')}</span></div>
            <div><strong>{number.format(total - deployed)}</strong><span>{t('dashboard.notDeployedApplications')}</span></div>
          </div>
        </div>}
  </DashboardPanel>
}
