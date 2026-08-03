import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ServerIcon } from '@/shared/icons/Icons'
import type { FlashSystemHostSummary } from '../../helpers/buildFlashSystemHostSummaries'
import { formatCapacityBytes } from '../../helpers/parseCapacity'

export interface FlashSystemHostTooltipLabels {
  showDetails: string
  hostId: string
  cluster: string
  notAssigned: string
  mappedVolumes: string
  mappedCapacity: string
  unavailable: string
  lun: string
  showAdditionalHosts: string
  additionalHosts: string
}

interface TooltipBadgeProps {
  ariaLabel: string
  children: ReactNode
  tooltip: ReactNode
  className?: string
}

const TOOLTIP_WIDTH = 304
const VIEWPORT_GAP = 8
const TRIGGER_GAP = 8
const ESTIMATED_TOOLTIP_HEIGHT = 320

function TooltipBadge({
  ariaLabel,
  children,
  tooltip,
  className = '',
}: TooltipBadgeProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({})
  const tooltipId = useId()

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const show = useCallback(() => {
    cancelClose()
    setOpen(true)
  }, [cancelClose])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, 120)
  }, [cancelClose])

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const width = Math.min(TOOLTIP_WIDTH, Math.max(0, window.innerWidth - (VIEWPORT_GAP * 2)))
    const measuredTooltipHeight = tooltipRef.current?.offsetHeight
    const tooltipHeight = measuredTooltipHeight !== undefined && measuredTooltipHeight > 0
      ? measuredTooltipHeight
      : ESTIMATED_TOOLTIP_HEIGHT
    const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - width - VIEWPORT_GAP)
    const left = Math.min(Math.max(rect.left, VIEWPORT_GAP), maxLeft)
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < tooltipHeight
      && rect.top > spaceBelow

    setPosition({
      left,
      top: placeAbove
        ? Math.max(VIEWPORT_GAP, rect.top - tooltipHeight - TRIGGER_GAP)
        : rect.bottom + TRIGGER_GAP,
      width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return

    const handleViewportChange = () => { updatePosition() }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!triggerRef.current?.contains(target) && !tooltipRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open, updatePosition])

  useEffect(() => () => { cancelClose() }, [cancelClose])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        className={`inline-flex h-6 min-w-0 max-w-36 items-center gap-1 rounded-lg border border-border-strong bg-surface px-2 text-[11px] font-semibold leading-none text-text-secondary shadow-[0_1px_1px_rgba(15,35,65,0.04)] transition hover:border-accent hover:bg-surface-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30 ${className}`}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.stopPropagation()
          cancelClose()
          setOpen(true)
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          }
        }}
      >
        {children}
      </button>
      {open && createPortal(
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          style={position}
          className="fixed z-[100] rounded-xl border border-border-strong bg-surface p-3 text-left text-xs font-normal leading-5 text-text-secondary shadow-[0_14px_36px_rgba(32,56,85,0.2)]"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(event) => { event.stopPropagation() }}
        >
          {tooltip}
        </div>,
        document.body,
      )}
    </>
  )
}

interface FlashSystemHostBadgeProps {
  summary: FlashSystemHostSummary
  labels: FlashSystemHostTooltipLabels
}

export function FlashSystemHostBadge({ summary, labels }: FlashSystemHostBadgeProps) {
  const cluster = summary.clusterName !== ''
    ? summary.clusterName
    : (summary.clusterId ?? labels.notAssigned)
  const mappedCapacity = summary.totalCapacityBytes === null
    ? labels.unavailable
    : formatCapacityBytes(summary.totalCapacityBytes)
  const isLongVolumeList = summary.mappedVolumes.length > 5

  return (
    <TooltipBadge
      ariaLabel={`${labels.showDetails} ${summary.name}`}
      tooltip={(
        <>
          <div className="flex min-w-0 items-start gap-2 border-b border-border pb-2">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ServerIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-text-primary" title={summary.name}>{summary.name}</p>
              <p className="truncate text-[11px] text-text-muted">{labels.hostId}: {summary.hostId}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 py-2">
            <dt className="text-text-muted">{labels.cluster}</dt>
            <dd className="min-w-0 truncate text-right font-medium text-text-secondary" title={cluster}>{cluster}</dd>
            <dt className="text-text-muted">{labels.mappedVolumes}</dt>
            <dd className="text-right font-medium tabular-nums text-text-secondary">{summary.mappedVolumes.length}</dd>
            <dt className="text-text-muted">{labels.mappedCapacity}</dt>
            <dd className="text-right font-medium tabular-nums text-text-secondary">{mappedCapacity}</dd>
          </dl>
          <div className="border-t border-border pt-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{labels.mappedVolumes}</p>
            <ul
              data-testid="mapped-volume-list"
              className={`custom-scrollbar space-y-0.5 ${isLongVolumeList ? 'max-h-[120px] overflow-y-auto pr-1' : ''}`}
            >
              {summary.mappedVolumes.map((volume) => (
                <li key={volume.resourceId} className="flex min-w-0 items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-surface-subtle">
                  <span className="truncate text-text-secondary" title={volume.name}>{volume.name}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-text-muted">
                    {labels.lun} {volume.scsiId || labels.unavailable}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    >
      <ServerIcon className="size-3.5 shrink-0 text-accent" />
      <span className="truncate">{summary.name}</span>
    </TooltipBadge>
  )
}

interface FlashSystemAdditionalHostsBadgeProps {
  summaries: FlashSystemHostSummary[]
  labels: FlashSystemHostTooltipLabels
}

export function FlashSystemAdditionalHostsBadge({
  summaries,
  labels,
}: FlashSystemAdditionalHostsBadgeProps) {
  return (
    <TooltipBadge
      ariaLabel={`${labels.showAdditionalHosts} ${String(summaries.length)}`}
      className="shrink-0 px-1.5 text-accent"
      tooltip={(
        <>
          <p className="mb-1.5 font-semibold text-text-primary">{labels.additionalHosts}</p>
          <ul className="custom-scrollbar max-h-[160px] space-y-1 overflow-y-auto pr-1">
            {summaries.map((summary) => (
              <li key={summary.key} className="flex min-w-0 items-center gap-1.5">
                <ServerIcon className="size-3.5 shrink-0 text-accent" />
                <span className="truncate" title={summary.name}>{summary.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    >
      +{summaries.length}
    </TooltipBadge>
  )
}
