import type { ReactNode } from 'react'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'

export interface ResourceInventoryPanelError {
  title: string
  description: string
  retryLabel: string
  isRetrying: boolean
  onRetry: () => void
}

interface ResourceInventoryPanelProps {
  ariaLabel: string
  toolbar: ReactNode
  children: ReactNode
  pagination?: ReactNode
  error?: ResourceInventoryPanelError | null
}

export function ResourceInventoryPanel({
  ariaLabel,
  toolbar,
  children,
  pagination,
  error,
}: ResourceInventoryPanelProps) {
  return (
    <section
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm lg:min-h-0"
      aria-label={ariaLabel}
    >
      {toolbar}
      <div className="custom-scrollbar flex-1 lg:min-h-0 lg:overflow-y-auto">
        {error ? (
          <div className="flex min-h-72 items-center justify-center p-4">
            <div className="w-full max-w-3xl">
              <FetchErrorAlert
                title={error.title}
                description={error.description}
                retryLabel={error.retryLabel}
                variant="full"
                isRetrying={error.isRetrying}
                onRetry={error.onRetry}
              />
            </div>
          </div>
        ) : children}
      </div>
      {!error && pagination}
    </section>
  )
}
