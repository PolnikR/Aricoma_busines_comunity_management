import { LayersIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { DashboardRecoveryApplication, DashboardState } from '../model/dashboardTypes'
import { DashboardPanel, DashboardStatePlaceholder } from './DashboardPanel'

export function RecoveryApplicationsDistribution({ applications, state }: { applications: DashboardRecoveryApplication[] | undefined; state: DashboardState }) {
  const { t, language } = useTranslation()
  const number = new Intl.NumberFormat(language)
  const total = applications?.length ?? 0
  const vmware = applications?.filter(application => application.platform === 'VMWARE').length ?? 0
  const power = applications?.filter(application => application.platform === 'IBM_POWER').length ?? 0
  const deployed = applications?.filter(application => application.deployed).length ?? 0
  const percent = (count: number) => new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(total ? count / total : 0)

  return <DashboardPanel title={t('dashboard.applications')} subtitle={t('dashboard.applicationsSubtitle')} icon={<LayersIcon className="icon" />}>
    {state === 'loading' || state === 'unknown' || total === 0
      ? <DashboardStatePlaceholder state={state === 'demo' || state === 'partial' ? 'empty' : state} />
      : <>
          <div className="console-platforms">
            <div className="console-chart-total" role="img" aria-label={t('dashboard.applicationsLabel', { total, vmware, power, vmwarePercent: percent(vmware), powerPercent: percent(power) })}>
              <strong>{number.format(total)}</strong><span>{t('dashboard.applicationDonutLabel')}</span>
            </div>
            <dl className="console-platform-list">{[{ key: 'appVmware', value: vmware }, { key: 'appPower', value: power }].map(part => <div className={`console-platform console-platform--${part.key}`} key={part.key}>
              <dt>{t(`dashboard.${part.key}`)}</dt>
              <dd><span className="console-platform-values"><strong>{number.format(part.value)}</strong><span>{percent(part.value)}</span></span><meter min={0} max={total} value={part.value} aria-label={t(`dashboard.${part.key}`)} /></dd>
            </div>)}</dl>
          </div>
          <dl className="console-stats"><div><dt>{t('dashboard.deployedApplications')}</dt><dd>{number.format(deployed)}</dd></div><div><dt>{t('dashboard.notDeployedApplications')}</dt><dd>{number.format(total - deployed)}</dd></div></dl>
        </>}
  </DashboardPanel>
}
