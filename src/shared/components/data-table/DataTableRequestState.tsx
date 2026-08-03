import type { ReactNode } from 'react'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'

export interface DataTableRequestError {
  title: string
  description?: string
  retryLabel: string
  isRetrying: boolean
  onRetry: () => void
}

interface DataTableRequestStateProps {
  children: ReactNode
  error?: DataTableRequestError | null
}

export function DataTableRequestState({ children, error }: DataTableRequestStateProps) {
  if (!error) return children

  return (
    <div className="flex min-h-72 flex-1 items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <FetchErrorAlert
          title={error.title}
          {...(error.description ? { description: error.description } : {})}
          retryLabel={error.retryLabel}
          variant="full"
          isRetrying={error.isRetrying}
          onRetry={error.onRetry}
        />
      </div>
    </div>
  )
}
