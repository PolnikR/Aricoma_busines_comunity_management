import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'

interface ResponseBodyViewerProps {
  data: unknown
}

function copyText(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text)
  } catch {
    return Promise.reject(new Error('Clipboard unavailable'))
  }
}

// Shared "copy + scrollable JSON" block reused by JsonViewerModal and any
// dialog that shows a raw response inline alongside other rendered content.
export function ResponseBodyViewer({ data }: ResponseBodyViewerProps) {
  const { t } = useTranslation()
  const [justCopied, setJustCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
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
  )
}
