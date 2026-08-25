import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

interface KeycloakPlaceholderSectionProps {
  title: string
}

export function KeycloakPlaceholderSection({ title }: KeycloakPlaceholderSectionProps) {
  const { t } = useTranslation()
  return (
    <div className="p-4">
      <EmptyState
        title={title}
        description={t('identity.placeholder.description')}
      />
    </div>
  )
}
