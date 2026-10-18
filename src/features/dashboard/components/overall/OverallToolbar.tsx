import type { StorageVendor } from '../../model/overallPreviewMetrics'

const vendors: { value: StorageVendor; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'ibm', label: 'IBM FlashSystem' }, { value: 'hitachi', label: 'Hitachi VSP' },
]

export function OverallToolbar({ vendor, onVendorChange }: { vendor: StorageVendor; onVendorChange: (value: StorageVendor) => void }) {
  const scope = vendors.find(item => item.value === vendor)?.label ?? 'All'
  return <div className="overall-toolbar">
    <span className="overall-scope"><i aria-hidden="true" />{vendor === 'all' ? 'All storage vendors' : scope} · protection filter</span>
    <div className="overall-toolbar-right">
      <span className="overall-date">16 Oct 2026 <b>·</b> Demo inventory</span>
      <div className="overall-vendor-switch" role="group" aria-label="Storage vendor">
        {vendors.map(item => <button key={item.value} type="button" aria-pressed={vendor === item.value} onClick={() => { onVendorChange(item.value) }}>{item.label}</button>)}
      </div>
    </div>
  </div>
}
