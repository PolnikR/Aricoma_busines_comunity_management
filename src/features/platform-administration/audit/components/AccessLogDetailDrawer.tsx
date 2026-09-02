import { DetailDrawer, DetailRow } from '@/shared/components/data-table'
import type { AccessLogRecord } from '../model/accessLogTypes'

interface AccessLogDetailDrawerProps {
  record: AccessLogRecord | null
  onClose: () => void
}

function formatBody(value: unknown) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') return value.toString()
  if (typeof value === 'symbol') return value.toString()

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '[Unable to serialize body]'
  }
}

function BodySection({ label, value }: { label: string; value: unknown }) {
  return (
    <section className="border-t border-border px-5 py-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{label}</h3>
      <pre className="custom-scrollbar mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-subtle p-3 font-mono text-xs text-text-secondary">
        {formatBody(value)}
      </pre>
    </section>
  )
}

export function AccessLogDetailDrawer({ record, onClose }: AccessLogDetailDrawerProps) {
  const isRequest = record?.kind === 'request'
  const title = isRequest ? `${record.method} ${record.path}` : 'Raw access-log entry'

  return (
    <DetailDrawer
      open={record !== null}
      onClose={onClose}
      resizable
      eyebrow="Access log"
      title={title}
      ariaLabel="Access log details"
      closeLabel="Close access log details"
    >
      {isRequest ? (
        <>
          <dl className="px-5 py-2">
            <DetailRow label="Method" value={<span className="font-mono">{record.method}</span>} />
            <DetailRow label="Path" value={<span className="font-mono">{record.path}</span>} />
            <DetailRow label="Status" value={String(record.status)} />
            <DetailRow label="Duration" value={`${String(record.durationMs)} ms`} />
          </dl>
          <BodySection label="Request body" value={record.requestBody} />
          <BodySection label="Response body" value={record.responseBody} />
        </>
      ) : record ? (
        <BodySection label="Raw entry" value={record.raw} />
      ) : null}
    </DetailDrawer>
  )
}
