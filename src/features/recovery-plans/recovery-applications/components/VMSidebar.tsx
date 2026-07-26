import { useState, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useVirtualMachinesUnified } from '@/features/hooks/useVirtualMachinesUnified'
import { Input } from '@/shared/components/form/FormControls'

interface VMSidebarProps {
  onVMSelect?: (vmName: string) => void
}

export function VMSidebar({ onVMSelect }: VMSidebarProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const { topology, isLoading } = useVirtualMachinesUnified()

  const availableVMs = useMemo(() => {
    if (!topology) return []
    return Array.from(
      new Set(
        topology.nodes
          .filter(node => node.kind === 'virtualMachine')
          .map(node => node.label)
      )
    ).sort()
  }, [topology])

  const filteredVMs = useMemo(() => {
    return availableVMs.filter(vm =>
      vm.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableVMs, searchQuery])

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">{t('recovery.sidebar.loadingVms')}</div>
  }

  return (
    <div className="flex flex-col overflow-hidden bg-[#fbfdff]">
      <div className="p-3 border-b border-[#edf2f7] shrink-0">
        <h3 className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider mb-2">
          {t('recovery.sidebar.availableVms')}
        </h3>
        <Input
          type="text"
          placeholder={t('recovery.sidebar.searchPlaceholder')}
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
          }}
          size="sm"
          className="text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {filteredVMs.length === 0 ? (
          <div className="text-xs text-[#91a4bc] text-center py-4">
            {searchQuery ? t('recovery.sidebar.noMatching') : t('recovery.sidebar.noVmsAvailable')}
          </div>
        ) : (
          filteredVMs.map(vm => (
            <div
              key={vm}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('vm-name', vm)
                onVMSelect?.(vm)
              }}
              className="p-2 mb-1 bg-[#f0f5fa] border border-[#d9e6f1] rounded-md text-xs text-[#18253d] cursor-grab hover:bg-[#e3edf6] hover:border-[#b9d5e8] transition-all"
            >
              {vm}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
