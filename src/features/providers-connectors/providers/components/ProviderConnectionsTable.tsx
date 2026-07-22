import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import type { ProviderConnection } from '../model/providerRegistry'

interface ProviderConnectionsTableProps {
  connections: ProviderConnection[]
}

export function ProviderConnectionsTable({ connections }: ProviderConnectionsTableProps) {
  const headerClass = 'whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'

  if (connections.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-[#71819a]">No connections configured for this provider.</p>
    )
  }

  return (
    <div className="custom-scrollbar w-full min-w-0 overflow-x-auto">
      <Table className="min-w-150">
        <TableHeader className="border-b border-[#dfe9f3] bg-[#f6f9fc]">
          <TableRow>
            <TableCell isHeader className={headerClass}>Name</TableCell>
            <TableCell isHeader className={headerClass}>Endpoint</TableCell>
            <TableCell isHeader className={headerClass}>Role</TableCell>
            <TableCell isHeader className={headerClass}>Status</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#edf2f7]">
          {connections.map((connection) => (
            <TableRow key={connection.name} className="bg-white">
              <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                {connection.name}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                {connection.endpoint}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                {connection.role}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#d1fae5] text-[#047857]">
                  {connection.status}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
