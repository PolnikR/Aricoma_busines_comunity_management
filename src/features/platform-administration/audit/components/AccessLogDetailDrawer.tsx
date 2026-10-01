import { DetailDrawer, DetailDrawerSection, DetailRow } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
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

function BodySection({ label, value, defaultOpen = false }: { label: string; value: unknown; defaultOpen?: boolean }) {
  return (
    <DetailDrawerSection title={label} defaultOpen={defaultOpen}>
      <pre className="custom-scrollbar max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-subtle p-3 font-mono text-xs text-text-secondary">
        {formatBody(value)}
      </pre>
    </DetailDrawerSection>
  )
}

export function AccessLogDetailDrawer({ record, onClose }: AccessLogDetailDrawerProps) {
  const { t } = useTranslation()
  const isRequest = record?.kind === 'request'
  const title = isRequest ? `${record.method} ${record.path}` : t('audit.accessLogs.table.rawEntry')

  return (
    <DetailDrawer
      open={record !== null}
      onClose={onClose}
      resizable
      title={title}
      meta={[
        t('audit.accessLogs.detail.entity'),
        isRequest ? `${t('audit.accessLogs.detail.status')} ${String(record.status)}` : null,
      ]}
      ariaLabel={t('audit.accessLogs.detail.ariaLabel')}
      closeLabel={t('audit.accessLogs.detail.close')}
      resizeLabel={t('drawer.resize')}
    >
      {isRequest ? (
        <>
          <DetailDrawerSection
            title={t('audit.accessLogs.detail.request')}
            summary={`${record.method} · ${String(record.status)}`}
            defaultOpen
          >
            <dl>
              <DetailRow label={t('audit.accessLogs.detail.method')} value={<span className="font-mono">{record.method}</span>} />
              <DetailRow label={t('audit.accessLogs.detail.path')} value={<span className="font-mono">{record.path}</span>} />
              <DetailRow label={t('audit.accessLogs.detail.status')} value={String(record.status)} />
              <DetailRow label={t('audit.accessLogs.detail.duration')} value={`${String(record.durationMs)} ms`} />
            </dl>
          </DetailDrawerSection>
          <BodySection label={t('audit.accessLogs.detail.requestBody')} value={record.requestBody} />
          <BodySection label={t('audit.accessLogs.detail.responseBody')} value={record.responseBody} />
        </>
      ) : record ? (
        // The raw entry is the drawer's only content, so it starts open.
        <BodySection label={t('audit.accessLogs.detail.rawEntry')} value={record.raw} defaultOpen />
      ) : null}
    </DetailDrawer>
  )
}
