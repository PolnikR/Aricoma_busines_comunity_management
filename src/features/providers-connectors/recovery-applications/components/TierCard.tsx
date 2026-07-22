import { useState } from 'react'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  tier: RecoveryTier
  onVMAdded?: (vmName: string) => void
  onVMRemoved?: (vmName: string) => void
}

export function TierCard({ tier, onVMAdded, onVMRemoved }: TierCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const vmName = e.dataTransfer.getData('vm-name')
    if (vmName) {
      onVMAdded?.(vmName)
    }
  }

  return (
    <div className="bg-white border-2 border-dashed border-[#d9e6f1] rounded-lg flex flex-col overflow-hidden min-w-[280px] shadow-sm">
      <div className="px-4 py-3 border-b border-[#edf2f7] bg-[#fbfdff]">
        <div className="text-xs text-[#7b8ca4] font-semibold uppercase tracking-wider mb-1">
          Order: <span className="font-bold">{tier.order}</span>
        </div>
        <div className="text-sm font-semibold text-[#18253d] mb-1">{tier.name}</div>
        <div className="text-xs text-[#71819a]">{tier.description}</div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-3 min-h-[300px] flex flex-col gap-2 transition-all ${
          isDragOver ? 'bg-[#e3edf6] border-t border-blue-light-500' : 'bg-[#f8fbfe]'
        }`}
      >
        {tier.vms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#91a4bc]">
            Drag VMs here
          </div>
        ) : (
          tier.vms.map(vm => (
            <div
              key={vm.name}
              className="p-2 bg-white border border-[#d9e6f1] rounded-md text-xs text-[#18253d] flex items-center justify-between group hover:border-[#b9d5e8]"
            >
              <span>{vm.name}</span>
              <button
                onClick={() => onVMRemoved?.(vm.name)}
                className="text-[#91a4bc] hover:text-[#d4353d] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove VM"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
