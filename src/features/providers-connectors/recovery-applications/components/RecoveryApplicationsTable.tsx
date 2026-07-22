import { useState } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
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
  applications: RecoveryApplication[] | undefined
}

export function RecoveryApplicationsTable({ applications }: RecoveryApplicationsTableProps) {
  const [selectedJson, setSelectedJson] = useState<object | null>(null)

  return (
    <>
      <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable recovery applications table">
        <Table className="min-w-190">
          <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
            <TableRow>
              <TableCell isHeader className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Application Name</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Description</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Environment</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-5 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#edf2f7]">
            {applications && applications.length > 0 ? (
              applications.map((app) => (
                <TableRow
                  key={app.id}
                  className="bg-white hover:bg-[#f9fbfd] transition-colors"
                >
                  <TableCell className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                    {app.data.application.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {app.data.application.description}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {app.data.application.environment}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <button
                      onClick={() => setSelectedJson(app.data)}
                      className="text-[#3566d6] hover:text-[#2a52b0] font-medium"
                    >
                      View JSON
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="px-5 py-8 text-center text-gray-600 dark:text-gray-400">
                  No applications found
                </TableCell>
                <TableCell className="px-5 py-8">-</TableCell>
                <TableCell className="px-5 py-8">-</TableCell>
                <TableCell className="px-5 py-8">-</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedJson && (
        <JsonViewer
          json={selectedJson}
          onClose={() => setSelectedJson(null)}
        />
      )}
    </>
  )
}
