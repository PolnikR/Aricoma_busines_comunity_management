import { useState, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Input } from '@/shared/components/form/FormControls'
import { ListSkeleton } from '@/shared/components/list-skeleton'

interface VMSidebarProps {
  onVMSelect?: (vmName: string) => void
}

export function VMSidebar({ onVMSelect }: VMSidebarProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const { data: inventory, error, isLoading, isFetching, refetch } = useDiscoveryInventory()

  const availableVMs = useMemo(() => {
    return Array.from(new Set(
      inventory?.virtualMachines.map((virtualMachine) => virtualMachine.name) ?? [],
    )).sort()
  }, [inventory])

  const filteredVMs = useMemo(() => {
    return availableVMs.filter(vm =>
      vm.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableVMs, searchQuery])

  const handleRefetch = () => { void refetch() }
  const errorDescription = error instanceof Error ? error.message : t('messages.unknownError')

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
          disabled={isLoading || !inventory}
          onChange={e => {
            setSearchQuery(e.target.value)
          }}
          size="sm"
          className="text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {isLoading ? (
          <ListSkeleton
            rowCount={8}
            ariaLabel={t('recovery.sidebar.loadingVms')}
          />
        ) : error && !inventory ? (
          <FetchErrorAlert
            title={t('pages.virtualMachines.error.title')}
            description={errorDescription}
            retryLabel={t('pages.virtualMachines.error.retryButton')}
            isRetrying={isFetching}
            onRetry={handleRefetch}
          />
        ) : (
          <>
            {error ? (
              <FetchErrorAlert
                className="mb-2"
                title={t('pages.virtualMachines.error.latestFailed')}
                description={t('pages.virtualMachines.error.showingPrevious')}
                isRetrying={isFetching}
                onRetry={handleRefetch}
              />
            ) : null}
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
          </>
        )}
      </div>
    </div>
  )
}
