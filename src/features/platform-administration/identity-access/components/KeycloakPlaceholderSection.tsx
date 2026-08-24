import { EmptyState } from '@/shared/components/empty-state/EmptyState'

interface KeycloakPlaceholderSectionProps {
  title: string
}

export function KeycloakPlaceholderSection({ title }: KeycloakPlaceholderSectionProps) {
  return (
    <div className="p-4">
      <EmptyState
        title={title}
        description="Keycloak integration for this administration area is not connected yet."
      />
    </div>
  )
}
