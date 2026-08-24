import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'

interface ResponseBodyViewerProps {
  data: unknown
  schemaTypeName?: string
  defaultOpen?: boolean
}

function copyText(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text)
  } catch {
    return Promise.reject(new Error('Clipboard unavailable'))
  }
}

// Shared "response body" panel reused by JsonViewerModal and any dialog that
// shows a raw response inline alongside other rendered content: a collapsible
// header bar, an optional schema caption, a copy button, and a scrollable
// JSON block. `defaultOpen` lets a JSON-only surface start expanded while
// staying collapsible; dialogs with other content default to collapsed.
export function ResponseBodyViewer({ data, schemaTypeName, defaultOpen = true }: ResponseBodyViewerProps) {
  const { t } = useTranslation()
  const [justCopied, setJustCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  return (
    <details className="group rounded-lg border border-border" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-text-secondary">
        {t('common.responseBody')}
        <ChevronDownIcon className="size-3.5 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          {schemaTypeName ? (
            <span className="text-xs text-text-subtle">
              {t('common.matchesSchema')} <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">{schemaTypeName}</code>
            </span>
          ) : <span />}
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              copyText(json)
                .then(() => {
                  setJustCopied(true)
                  setTimeout(() => { setJustCopied(false) }, 1400)
                })
                .catch(() => { /* clipboard unavailable, no-op */ })
            }}
          >
            {t(justCopied ? 'common.copied' : 'common.copy')}
          </Button>
        </div>
        <pre className="max-h-64 overflow-y-auto overflow-x-auto rounded-md bg-surface-subtle p-3 font-mono text-xs text-text-secondary">
          {json}
        </pre>
      </div>
    </details>
  )
}
