import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { CheckIcon } from '@/shared/icons/Icons'

export interface CheckItem {
  name: string
  detail?: string
  status: 'ok' | 'warning' | 'error' | string
}

export interface BadgeConfig {
  label: string
  color: 'info' | 'success' | 'warning' | 'error' | 'light'
  size?: 'sm' | 'md'
}

export interface StatusBar {
  title: string
  status: 'success' | 'warning' | 'error'
  passedCount: number
  totalCount: number
}

export interface ChecklistResultDialogProps {
  open: boolean
  title: string
  primaryName: string
  subtitle: string
  badges?: BadgeConfig[]
  statusBar: StatusBar
  checks: CheckItem[]
  responseData: unknown
  responseSchemaType?: string
  onClose: () => void
  onRetry?: () => void
  isPending?: boolean
}

function isCheckOk(status: string): boolean {
  return status.trim().toLowerCase() === 'ok'
}

function CheckStatusIcon({ status }: { status: string }) {
  if (isCheckOk(status)) return <CheckIcon className="size-4" />
  return <span aria-hidden="true">!</span>
}

export function ChecklistResultDialog({
  open,
  title,
  primaryName,
  subtitle,
  badges = [],
  statusBar,
  checks,
  responseData,
  responseSchemaType,
  onClose,
  onRetry,
  isPending = false,
}: ChecklistResultDialogProps) {
  const isFailed = statusBar.status === 'error' || !isPending && statusBar.status === 'warning'

  const statusBgColor = {
    success: 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300',
    warning: 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300',
    error: 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300',
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      closeOnBackdrop={!isPending}
      footer={(
        <>
          {isFailed && onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isPending} fullWidth>
              Retry
            </Button>
          ) : null}
          <Button size="sm" variant="primary" onClick={onClose} disabled={isPending} fullWidth>
            Close
          </Button>
        </>
      )}
    >
      <div className="space-y-5 px-6 py-5">
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{primaryName}</p>
            <p className="mt-1 break-all font-mono text-xs text-text-muted">{subtitle}</p>
          </div>
          {badges.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              {badges.map((badge, idx) => (
                <Badge key={idx} color={badge.color} size={badge.size ?? 'sm'}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {/* Status Bar */}
        <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${statusBgColor[statusBar.status]}`}>
          <span className="inline-flex items-center gap-2">
            <CheckIcon className="size-4" />
            {statusBar.title}
          </span>
          <span className="shrink-0 rounded-full border border-current px-2 py-0.5 font-mono text-xs tabular-nums opacity-75">
            {statusBar.passedCount} / {statusBar.totalCount} passed
          </span>
        </div>

        {/* Checks List */}
        {checks.length > 0 ? (
          <ol className="space-y-2" aria-label="Status checks">
            {checks.map((check, index) => {
              const isOk = isCheckOk(check.status)
              return (
                <li
                  key={`${check.name}-${index}`}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2.5"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                      isOk
                        ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                        : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'
                    }`}
                  >
                    <CheckStatusIcon status={check.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary">{check.name}</span>
                      <span className="shrink-0 text-xs text-text-muted">{check.status}</span>
                    </div>
                    {check.detail ? (
                      <p className="mt-0.5 font-mono text-xs text-text-muted">{check.detail}</p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : null}

        {/* Response Tab */}
        {responseData ? (
          <ResponseBodyViewer data={responseData} schemaTypeName={responseSchemaType} />
        ) : null}
      </div>
    </Modal>
  )
}
