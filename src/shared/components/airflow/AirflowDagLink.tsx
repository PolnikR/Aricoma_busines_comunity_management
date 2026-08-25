import type { MouseEvent } from 'react'
import { buildAirflowDagUrl, normalizeAirflowDagId } from '@/config/externalServices'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface AirflowDagLinkProps {
  runId: string
  providerUrl?: string | null | undefined
  stopPropagation?: boolean
  className?: string
}

export function AirflowDagLink({
  runId,
  providerUrl,
  stopPropagation = false,
  className,
}: AirflowDagLinkProps) {
  const dagId = normalizeAirflowDagId(runId)
  const handleClick = stopPropagation
    ? (event: MouseEvent<HTMLAnchorElement>) => { event.stopPropagation() }
    : undefined

  return (
    <a
      href={buildAirflowDagUrl(runId, providerUrl)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 font-mono text-xs text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
        className,
      )}
      onClick={handleClick}
    >
      {dagId}
      <ExternalLinkIcon className="size-3.5 shrink-0" />
    </a>
  )
}
