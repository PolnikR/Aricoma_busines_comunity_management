import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DetailCopyButton } from './DetailCopyButton'

interface DetailCodeProps {
  // Caption, e.g. "JSON" or "Request body".
  label: string
  // Short facts next to the caption, e.g. "214 B".
  meta?: ReactNode
  value: string
  // Text when there is nothing to show; defaults to "No content".
  emptyLabel?: ReactNode
  // 'json' tints keys and literals; 'text' shows the value as is.
  language?: 'json' | 'text'
}

const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g

// Splits JSON text into nodes with existing tokens only: keys primary, strings secondary,
// literals accent. The text content stays identical to the input.
function tintJson(source: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of source.matchAll(JSON_TOKEN)) {
    const [token, string, colon] = match
    const start = match.index
    if (start > last) nodes.push(source.slice(last, start))
    if (string && colon) nodes.push(<span key={start} className="text-text-primary">{string}</span>, colon)
    else if (string) nodes.push(<span key={start} className="text-text-secondary">{string}</span>)
    else nodes.push(<span key={start} className="text-accent">{token}</span>)
    last = start + token.length
  }
  if (last < source.length) nodes.push(source.slice(last))
  return nodes
}

// Raw payloads (JSON, request and response bodies, raw data): a caption with Copy and a
// scrolling, wrapping mono body on a subtle surface, or an empty state.
export function DetailCode({ label, meta, value, emptyLabel, language = 'text' }: DetailCodeProps) {
  const { t } = useTranslation()
  const empty = value.trim() === ''
  return (
    <figure className="overflow-hidden rounded-lg border border-border/70 bg-surface-subtle">
      <figcaption className="flex items-center gap-2 border-b border-border/70 px-4 py-1.5 text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        {meta ? <span className="text-text-subtle">· {meta}</span> : null}
        {empty ? null : <DetailCopyButton value={value} showText className="ml-auto" />}
      </figcaption>
      {empty ? (
        <p className="px-4 py-6 text-sm text-text-muted">{emptyLabel ?? t('detailView.noContent')}</p>
      ) : (
        <pre className="custom-scrollbar max-h-[26rem] overflow-auto px-4 py-3 font-mono text-[12px] leading-5 whitespace-pre-wrap text-text-muted wrap-anywhere">
          {language === 'json' ? tintJson(value) : value}
        </pre>
      )}
    </figure>
  )
}
