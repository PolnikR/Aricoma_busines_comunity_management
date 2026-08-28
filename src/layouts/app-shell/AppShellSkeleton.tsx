import { useTranslation } from '@/hooks/useTranslation'

const sidebarItems = Array.from({ length: 6 })
const tableRows = Array.from({ length: 6 })

export function AppShellSkeleton() {
  const { t } = useTranslation()

  return (
    <div
      className="min-h-screen p-0 text-text-primary lg:h-screen lg:overflow-hidden lg:p-3 xl:p-4"
      role="status"
      aria-busy="true"
      aria-label={t('messages.loading')}
    >
      <div className="flex min-h-screen w-full gap-3 lg:h-full lg:min-h-0 xl:gap-4" aria-hidden="true">
        <aside className="hidden flex-col rounded-[22px] border border-border bg-surface px-3 shadow-sm lg:flex lg:w-[272px] lg:shrink-0 xl:w-[min(352px,32vw)]">
          <div className="flex h-[72px] items-center gap-2.5 border-b border-border px-2">
            <div className="size-9 animate-pulse rounded-lg bg-surface-muted" />
            <div className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>

          <div className="space-y-3 py-5">
            <div className="h-2.5 w-12 animate-pulse rounded bg-surface-muted" />
            {sidebarItems.map((_, index) => (
              <div key={index} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                <div className="size-4 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 flex-1 animate-pulse rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-surface lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-border lg:shadow-sm">
          <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface/95 px-4 sm:px-6 lg:h-[72px] lg:px-7">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-surface-muted sm:hidden" />
            <div className="hidden h-10 w-[min(42vw,420px)] animate-pulse rounded-xl bg-surface-muted sm:block" />
            <div className="ml-auto size-9 animate-pulse rounded-full bg-surface-muted" />
          </header>

          <main className="flex flex-1 flex-col px-4 py-5 sm:px-6 lg:min-h-0 lg:overflow-hidden lg:px-6 lg:py-5 xl:px-8">
            <div data-testid="skeleton-page-heading" className="mb-5 flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
                <div className="h-8 w-56 max-w-[70vw] animate-pulse rounded-md bg-surface-muted sm:w-72" />
                <div className="h-4 w-72 max-w-[80vw] animate-pulse rounded bg-surface-muted sm:w-96" />
              </div>
              <div className="h-9 w-24 shrink-0 animate-pulse rounded-lg bg-surface-muted sm:w-28" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="h-10 w-full animate-pulse rounded-xl bg-surface-muted sm:w-72" />
                <div className="flex gap-3">
                  <div className="h-10 flex-1 animate-pulse rounded-xl bg-surface-muted sm:w-56" />
                  <div className="h-9 w-20 animate-pulse rounded-lg bg-surface-muted sm:w-24" />
                </div>
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="grid grid-cols-5 border-b border-border bg-surface-subtle px-3 py-2.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-3 animate-pulse rounded bg-surface-muted" />
                  ))}
                </div>
                {tableRows.map((_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-5 gap-3 border-b border-border px-3 py-4 last:border-b-0">
                    {Array.from({ length: 5 }).map((__, columnIndex) => (
                      <div
                        key={columnIndex}
                        className={`h-3 animate-pulse rounded bg-surface-muted ${columnIndex === 0 ? 'w-full' : 'w-3/4'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}
