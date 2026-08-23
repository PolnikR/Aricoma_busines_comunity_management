import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { IdentityResourceHeader } from './IdentityResourceLayout'

export function PermissionsSection() {
  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader
        eyebrow="Configure"
        title="Permissions"
        description="Keycloak fine-grained administration permissions for realm resources."
      />
      <div className="p-4">
        <EmptyState
          title="Fine-grained admin permissions not connected"
          description="The current generic ABCO Permission mock is an application authorization model, not the Keycloak fine-grained administration permissions contract. It is intentionally excluded from this section until the backend contract is defined."
        />
      </div>
    </div>
  )
}
