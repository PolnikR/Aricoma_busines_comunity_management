import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { Button } from '@/shared/components/button/Button'
import { PROVIDERS } from '../model/providerRegistry'
import type { ProviderStatus } from '../model/providerRegistry'

function statusBadgeClass(status: ProviderStatus): string {
  return status === 'Active'
    ? 'bg-[#d1fae5] text-[#047857]'
    : 'bg-[#eef1f5] text-[#71819a]'
}

export function ProvidersCatalogueTable() {
  const navigate = useNavigate()

  const openProvider = (id: string) => {
    void navigate(`/providers-connectors/providers/${id}`)
  }

  const headerClass = 'whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'

  return (
    <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable providers table">
      <Table className="min-w-190">
        <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
          <TableRow>
            <TableCell isHeader className={headerClass}>Provider</TableCell>
            <TableCell isHeader className={headerClass}>Type</TableCell>
            <TableCell isHeader className={headerClass}>Connections</TableCell>
            <TableCell isHeader className={headerClass}>Capabilities</TableCell>
            <TableCell isHeader className={headerClass}>Status</TableCell>
            <TableCell isHeader className={headerClass}>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#edf2f7]">
          {PROVIDERS.map((provider) => (
            <TableRow key={provider.id} className="bg-white hover:bg-[#f9fbfd] transition-colors">
              <TableCell className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                {provider.name}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                {provider.type}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                {provider.connections.length}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                {provider.capabilities.join(', ')}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(provider.status)}`}>
                  {provider.status}
                </span>
              </TableCell>
              <TableCell className="px-5 py-4 text-sm">
                <Button size="sm" variant="outline" onClick={() => { openProvider(provider.id) }}>
                  {provider.status === 'Active' ? 'View / Configure' : 'Enable'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
