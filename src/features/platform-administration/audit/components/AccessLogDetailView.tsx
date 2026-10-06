import {
  DetailCode,
  DetailField,
  DetailFieldGroup,
  DetailView,
  DetailViewSection,
} from '@/shared/components/detail-view'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { ApiIcon, GridIcon } from '@/shared/icons/Icons'
import type { AccessLogRecord } from '../model/accessLogTypes'

interface AccessLogDetailViewProps {
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

// A render function, not a component: DetailView reads its sections from direct children.
function bodySection(id: string, label: string, value: unknown) {
  return (
    <DetailViewSection id={id} title={label} icon={ApiIcon}>
      <DetailCode label={label} value={formatBody(value)} language={typeof value === 'object' && value !== null ? 'json' : 'text'} />
    </DetailViewSection>
  )
}

export function AccessLogDetailView({ record, onClose }: AccessLogDetailViewProps) {
  const { t } = useTranslation()
  if (!record) return null
  const isRequest = record.kind === 'request'

  return (
    <DetailView
      open
      onClose={onClose}
      entityLabel={t('audit.accessLogs.detail.entity')}
      title={isRequest ? `${record.method} ${record.path}` : t('audit.accessLogs.table.rawEntry')}
      headerActions={<KeyedHelpPopover helpKey="audit.accessLogs.help" sections={['status', 'bodies', 'raw']} />}
      ariaLabel={t('audit.accessLogs.detail.ariaLabel')}
      closeLabel={t('audit.accessLogs.detail.close')}
    >
      {isRequest ? (
        <>
          {/* One flat list in the order of the original detail drawer. */}
          <DetailViewSection id="request" title={t('audit.accessLogs.detail.request')} icon={GridIcon}>
            <DetailFieldGroup>
              <DetailField label={t('audit.accessLogs.detail.method')} value={record.method} mono emphasis />
              <DetailField label={t('audit.accessLogs.detail.path')} value={record.path} mono wide copyValue={record.path} />
              <DetailField label={t('audit.accessLogs.detail.queryString')} value={record.queryString} mono wide copyValue={record.queryString} />
              <DetailField label={t('audit.accessLogs.detail.status')} value={String(record.status)} />
              <DetailField label={t('audit.accessLogs.detail.duration')} value={`${String(record.durationMs)} ms`} />
              <DetailField label={t('audit.accessLogs.detail.userAgent')} value={record.userAgent} wide />
              <DetailField label={t('audit.accessLogs.detail.referer')} value={record.referer} mono wide copyValue={record.referer} />
            </DetailFieldGroup>
          </DetailViewSection>
          {bodySection('request-body', t('audit.accessLogs.detail.requestBody'), record.requestBody)}
          {bodySection('response-body', t('audit.accessLogs.detail.responseBody'), record.responseBody)}
        </>
      ) : (
        bodySection('raw', t('audit.accessLogs.detail.rawEntry'), record.raw)
      )}
    </DetailView>
  )
}
