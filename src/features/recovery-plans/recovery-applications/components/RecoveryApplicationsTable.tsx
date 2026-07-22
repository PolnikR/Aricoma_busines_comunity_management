import { useState } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { Button } from '@/shared/components/button/Button'
import type { RecoveryApplication } from '../model/recoveryApplicationTypes'

interface JsonViewerProps {
  json: object
  onClose: () => void
}

function JsonViewer({ json, onClose }: JsonViewerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-auto">
        <div className="sticky top-0 bg-white border-b border-[#e3edf6] p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[#17233d]">Application JSON</h3>
          <button
            onClick={onClose}
            className="text-[#71819a] hover:text-[#17233d] text-2xl leading-none"
          >
            ✕
          </button>
        </div>
        <pre className="p-4 text-xs bg-[#f8fbfe] text-[#17233d] overflow-auto">
          {JSON.stringify(json, null, 2)}
        </pre>
      </div>
    </div>
  )
}

interface RecoveryApplicationsTableProps {
  applications: RecoveryApplication[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

function getApplicationStatus(app: RecoveryApplication): 'Active' | 'Draft' {
  const tiers = Object.keys(app.data.application.tiers)
  return tiers.length > 0 ? 'Active' : 'Draft'
}

function getStatusColor(status: 'Active' | 'Draft'): string {
  return status === 'Active'
    ? 'bg-[#d1fae5] text-[#047857]'
    : 'bg-[#fef3c7] text-[#92400e]'
}

// Short provider label derived from the application platform.
function getProviderLabel(platform: string): string {
  if (platform.startsWith('VMware')) return 'VMware'
  if (platform.startsWith('IBM')) return 'IBM PowerVM'
  return platform || '—'
}

export function RecoveryApplicationsTable({ applications, onEdit, onDelete }: RecoveryApplicationsTableProps) {
  const [selectedJson, setSelectedJson] = useState<object | null>(null)

  const headerClass = 'whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400'

  return (
    <>
      <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable recovery applications table">
        <Table className="min-w-190">
          <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
            <TableRow>
              <TableCell isHeader className={headerClass}>Application Name</TableCell>
              <TableCell isHeader className={headerClass}>Environment</TableCell>
              <TableCell isHeader className={headerClass}>Provider</TableCell>
              <TableCell isHeader className={headerClass}>Tiers</TableCell>
              <TableCell isHeader className={headerClass}>Status</TableCell>
              <TableCell isHeader className={headerClass}>Submission</TableCell>
              <TableCell isHeader className={headerClass}>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#edf2f7]">
            {applications.length > 0 ? (
              applications.map((app) => {
                const status = getApplicationStatus(app)
                const tierCount = Object.keys(app.data.application.tiers).length
                return (
                  <TableRow key={app.id} className="bg-white hover:bg-[#f9fbfd] transition-colors">
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                      {app.data.application.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {app.data.application.environment}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {getProviderLabel(app.data.application.platform)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {tierCount}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {app.submission ? (
                        <span
                          title={app.submission.remotePath}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${app.submission.status === 'ok' ? 'bg-[#d1fae5] text-[#047857]' : 'bg-[#fee2e2] text-[#b91c1c]'}`}
                        >
                          <span className={`size-1.5 rounded-full ${app.submission.status === 'ok' ? 'bg-[#047857]' : 'bg-[#b91c1c]'}`} />
                          {app.submission.status}
                        </span>
                      ) : (
                        <span className="text-[#9aa7bd]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedJson(app.data) }}
                          title="View application JSON"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { onEdit?.(app.id) }}
                          title="Edit application configuration"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => { onDelete?.(app.id) }}
                          title="Delete application"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell className="px-5 py-8 text-center text-gray-600 dark:text-gray-400 col-span-7">
                  No applications found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedJson && (
        <JsonViewer
          json={selectedJson}
          onClose={() => { setSelectedJson(null); }}
        />
      )}
    </>
  )
}
