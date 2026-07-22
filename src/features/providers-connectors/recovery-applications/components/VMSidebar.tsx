import { useState, useMemo } from 'react'
import { useInfrastructureTopology } from '@/features/discovery-inventory/infrastructure/api/useInfrastructureTopology'

interface VMSidebarProps {
  onVMSelect?: (vmName: string) => void
}

export function VMSidebar({ onVMSelect }: VMSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: topology, isLoading } = useInfrastructureTopology()

  const availableVMs = useMemo(() => {
    if (!topology) return []
    return topology.nodes
      .filter(node => node.kind === 'virtualMachine')
      .map(node => node.label)
      .sort()
  }, [topology])

  const filteredVMs = useMemo(() => {
    return availableVMs.filter(vm =>
      vm.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableVMs, searchQuery])

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading VMs...</div>
  }

  return (
    <div className="w-80 bg-white border border-[#e3edf6] rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="p-3 border-b border-[#edf2f7] bg-[#fbfdff]">
        <h3 className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider mb-2">
          Available VMs
        </h3>
        <input
          type="text"
          placeholder="Search VMs..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
          }}
          className="w-full px-2 py-1.5 text-xs border border-[#cfdaea] rounded-md focus:outline-none focus:border-blue-light-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredVMs.length === 0 ? (
          <div className="text-xs text-[#91a4bc] text-center py-4">
            {searchQuery ? 'No VMs match your search' : 'No VMs available'}
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
