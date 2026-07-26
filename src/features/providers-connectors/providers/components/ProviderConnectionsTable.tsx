import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { Badge } from '@/shared/components/badge/Badge'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderConnection } from '../model/providerRegistry'

interface ProviderConnectionsTableProps {
  connections: ProviderConnection[]
}

export function ProviderConnectionsTable({ connections }: ProviderConnectionsTableProps) {
  const { t } = useTranslation()
  const headerClass = 'whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'

  if (connections.length === 0) {
    return (
      <p className="px-1 py-4 text-sm text-[#71819a]">{t('messages.noResults')}</p>
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
              <TableCell className="px-5 py-4 text-sm">
                <Badge color={connection.role === 'Source' ? 'info' : 'primary'} size="sm">
                  {connection.role}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4 text-sm">
                <Badge color={connection.status === 'Connected' ? 'success' : 'warning'} size="sm">
                  {connection.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
