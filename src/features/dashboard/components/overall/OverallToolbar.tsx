import type { StorageVendor } from '../../model/overallPreviewMetrics'
import { useTranslation } from '@/hooks/useTranslation'

const vendors: { value: StorageVendor; label: string }[] = [
  { value: 'all', label: '' }, { value: 'ibm', label: 'IBM FlashSystem' }, { value: 'hitachi', label: 'Hitachi VSP' },
]

export function OverallToolbar({ vendor, onVendorChange }: { vendor: StorageVendor; onVendorChange: (value: StorageVendor) => void }) {
  const { t, language } = useTranslation()
  const scope = vendor === 'all' ? t('overview.allVendors') : vendors.find(item => item.value === vendor)?.label ?? t('overview.allVendors')
  const date = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date('2026-10-16T00:00:00Z'))
  return <div className="overall-toolbar">
    <span className="overall-scope"><i aria-hidden="true" />{t('overview.protectionFilter', { scope })}</span>
    <div className="overall-toolbar-right">
      <span className="overall-date">{date} <b>·</b> {t('overview.demoInventory')}</span>
      <div className="overall-vendor-switch" role="group" aria-label={t('overview.storageVendor')}>
        {vendors.map(item => <button key={item.value} type="button" aria-pressed={vendor === item.value} onClick={() => { onVendorChange(item.value) }}>{item.value === 'all' ? t('overview.all') : item.label}</button>)}
      </div>
    </div>
  </div>
}
