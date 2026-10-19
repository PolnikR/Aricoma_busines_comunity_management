import { useId } from 'react'
import type { StorageVendor } from '../../model/overallPreviewMetrics'
import { useTranslation } from '@/hooks/useTranslation'

const vendors: { value: StorageVendor; label: string }[] = [
  { value: 'all', label: '' }, { value: 'ibm', label: 'IBM FlashSystem' }, { value: 'hitachi', label: 'Hitachi VSP' },
]

export function OverallVendorFilter({ vendor, onVendorChange }: { vendor: StorageVendor; onVendorChange: (value: StorageVendor) => void }) {
  const { t } = useTranslation()
  const labelId = useId()
  return <div className="overall-vendor-filter" role="group" aria-labelledby={labelId}>
    <span id={labelId}>{t('overview.storageVendor')}</span>
    <div className="overall-vendor-switch">
      {vendors.map(item => <button key={item.value} type="button" aria-pressed={vendor === item.value} onClick={() => { onVendorChange(item.value) }}>{item.value === 'all' ? t('overview.all') : item.label}</button>)}
    </div>
  </div>
}
