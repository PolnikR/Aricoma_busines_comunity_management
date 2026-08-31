import { DataTable } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import { createVmwareColumns } from '../../config/vmwareColumns'
import type { VirtualMachine } from '../../types/virtualMachineTypes'

export type { TableDensity }

interface VirtualMachinesTableProps {
  virtualMachines: VirtualMachine[]
  selectedId: string | null
  density: TableDensity
  onSelect: (virtualMachine: VirtualMachine) => void
  isLoading?: boolean
}

export function VirtualMachinesTable({ virtualMachines, selectedId, density, onSelect, isLoading = false }: VirtualMachinesTableProps) {
  const { t } = useTranslation()
  const showDetail = density === 'comfortable'
  const columns = createVmwareColumns(t, showDetail)

  return (
    <DataTable<VirtualMachine>
      columns={columns}
      rows={virtualMachines}
      isLoading={isLoading}
      loadingRowCount={Math.max(virtualMachines.length, 3)}
      rowKey={(vm: VirtualMachine, index: number) => `${vm.id}-${String(index)}`}
      rowSelectionKey={(vm: VirtualMachine): string => vm.id}
      rowAriaLabel={(vm: VirtualMachine): string => `${t('vm.showDetails')} ${vm.name}`}
      density={density}
      selectedRowKey={selectedId}
      onRowClick={onSelect}
      minWidthClassName="min-w-260"
      ariaLabel={isLoading ? t('pages.virtualMachines.loading') : t('vm.tableLabel')}
      headerCellClassName="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle"
      cellClassName={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-[13px] text-text-secondary align-top`}
    />
  )
}
