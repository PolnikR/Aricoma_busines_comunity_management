import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { CheckIcon, CopyIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface DetailCopyButtonProps {
  value: string
  // What is copied, for the accessible name ("Copy Group ID"). Defaults to "Copy".
  label?: string
  // Show "Copy" next to the icon (code blocks); fields use the icon alone.
  showText?: boolean
  className?: string
}

const COPIED_FOR_MS = 1500

// Copy action used by DetailField, DetailStatusBlock and DetailCode. It confirms with a
// check icon and the "Copied" label for a moment; a failing clipboard leaves it unchanged.
export function DetailCopyButton({ value, label, showText = false, className }: DetailCopyButtonProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => { clearTimeout(timer.current) }, [])

  const copy = () => {
    let pending: Promise<void>
    try {
      pending = navigator.clipboard.writeText(value)
    } catch {
      return
    }
    pending.then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => { setCopied(false) }, COPIED_FOR_MS)
    }).catch(() => undefined)
  }

  const name = copied ? t('common.copied') : label ? t('detailView.copyField', { label }) : t('common.copy')
  const Icon = copied ? CheckIcon : CopyIcon

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={showText ? undefined : name}
      title={showText ? undefined : name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-text-subtle transition hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
        showText ? 'h-7 px-2 text-xs font-medium text-text-muted' : 'size-6',
        className,
      )}
    >
      <Icon className={cn('size-3.5', copied ? 'text-success-600 dark:text-success-500' : undefined)} />
      {showText ? <span>{copied ? t('common.copied') : t('common.copy')}</span> : null}
    </button>
  )
}
