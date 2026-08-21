import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { SidebarProvider } from '@/layouts/app-shell/SidebarContext'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...STANDARD_QUERY_OPTIONS,
    },
  },
})

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>{children}</SidebarProvider>
    </QueryClientProvider>
  )
}
