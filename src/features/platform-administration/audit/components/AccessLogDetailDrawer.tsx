import {
  DetailCode,
  DetailField,
  DetailFieldGroup,
  DetailStatusBlock,
  DetailTechnicalGroup,
  DetailView,
  DetailViewSection,
} from '@/shared/components/detail-view'
import type { DetailStatusTone } from '@/shared/components/detail-view'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { ApiIcon, GridIcon } from '@/shared/icons/Icons'
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

// Tone of the HTTP status class: 2xx success, 3xx info, 4xx warning, 5xx error.
function statusTone(status: number): DetailStatusTone {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warning'
  if (status >= 300) return 'info'
  if (status >= 200) return 'success'
  return 'neutral'
}

// A render function, not a component: DetailView reads its sections from direct children.
function bodySection(id: string, label: string, value: unknown) {
  return (
    <DetailViewSection id={id} title={label} icon={ApiIcon}>
      <DetailCode label={label} value={formatBody(value)} language={typeof value === 'object' && value !== null ? 'json' : 'text'} />
    </DetailViewSection>
  )
}

export function AccessLogDetailDrawer({ record, onClose }: AccessLogDetailDrawerProps) {
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
          <DetailViewSection id="request" title={t('audit.accessLogs.detail.request')} icon={GridIcon}>
            <DetailStatusBlock
              title={t('audit.accessLogs.detail.status')}
              status={String(record.status)}
              tone={statusTone(record.status)}
            >
              <DetailField label={t('audit.accessLogs.detail.duration')} value={`${String(record.durationMs)} ms`} />
            </DetailStatusBlock>
            <DetailFieldGroup>
              <DetailField label={t('audit.accessLogs.detail.method')} value={record.method} mono emphasis />
              <DetailField label={t('audit.accessLogs.detail.path')} value={record.path} mono wide copyValue={record.path} />
              <DetailField label={t('audit.accessLogs.detail.queryString')} value={record.queryString} mono wide copyValue={record.queryString} />
            </DetailFieldGroup>
            <DetailTechnicalGroup title={t('audit.accessLogs.detail.client')}>
              <DetailField label={t('audit.accessLogs.detail.userAgent')} value={record.userAgent} />
              <DetailField label={t('audit.accessLogs.detail.referer')} value={record.referer} copyValue={record.referer} />
            </DetailTechnicalGroup>
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
