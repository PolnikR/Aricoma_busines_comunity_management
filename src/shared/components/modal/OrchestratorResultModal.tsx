import type { ReactNode } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { DetailRow } from '@/shared/components/data-table'
import { CheckIcon, ExternalLinkIcon } from '@/shared/icons/Icons'
import { Modal } from './Modal'

export interface OrchestratorResultDetail {
  label: string
  value: ReactNode
  mono?: boolean
}

interface OrchestratorResultModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: ReactNode
  statusLabel: string
  status: string
  details: OrchestratorResultDetail[]
  closeLabel: string
  externalActionLabel?: string
  onExternalAction?: () => void
  ariaLabel?: string
}

export function OrchestratorResultModal({
  open,
  onClose,
  title,
  description,
  statusLabel,
  status,
  details,
  closeLabel,
  externalActionLabel,
  onExternalAction,
  ariaLabel,
}: OrchestratorResultModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      {...(ariaLabel ? { ariaLabel } : {})}
      footer={(
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {closeLabel}
          </Button>
          {externalActionLabel && onExternalAction ? (
            <Button
              className="flex-1"
              endIcon={<ExternalLinkIcon className="size-4" />}
              onClick={onExternalAction}
            >
              {externalActionLabel}
            </Button>
          ) : null}
        </>
      )}
    >
      <div className="flex items-start gap-3.5 border-b border-border px-6 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
          <CheckIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="mt-1 text-xs text-text-muted wrap-break-word">{description}</p>
        </div>
      </div>
      <dl className="px-6">
        <DetailRow
          label={statusLabel}
          value={<Badge color="success" size="sm">{status}</Badge>}
        />
        {details.map(detail => (
          <DetailRow
            key={detail.label}
            label={detail.label}
            value={(
              <span className={detail.mono ? 'font-mono wrap-break-word' : 'wrap-break-word'}>
                {detail.value}
              </span>
            )}
          />
        ))}
      </dl>
    </Modal>
  )
}
