import { Badge } from '@/shared/components/badge/Badge'
import { cn } from '@/shared/utils/cn'
import type { PlatformProviderConfig } from '../mocks/platformProviderConfigMocks'

interface PlatformProviderConfigListProps {
  providers: PlatformProviderConfig[]
  selectedProviderId: string
  onSelect: (providerId: string) => void
}

export function PlatformProviderConfigList({ providers, selectedProviderId, onSelect }: PlatformProviderConfigListProps) {
  return (
    <nav
      aria-label="Configured providers"
      className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_35px_-28px_rgba(37,72,112,0.45)] lg:h-full lg:w-65 lg:shrink-0"
    >
      <div className="shrink-0 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Providers
      </div>
      <div role="list" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {providers.map((provider) => {
          const isActive = provider.id === selectedProviderId

          return (
            <div key={provider.id} role="listitem">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => { onSelect(provider.id) }}
                className={cn(
                  'flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left transition first:border-t-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
                  isActive ? 'bg-accent-soft' : 'hover:bg-surface-subtle',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{provider.name}</span>
                  <Badge
                    variant="light"
                    size="sm"
                    color={provider.connectionStatus === 'connected' ? 'success' : 'light'}
                    className="mt-1"
                  >
                    {provider.connectionStatus === 'connected' ? 'Connected' : 'Not configured'}
                  </Badge>
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
