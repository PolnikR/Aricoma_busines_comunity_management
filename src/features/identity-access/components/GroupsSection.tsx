import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Input } from '@/shared/components/form/FormControls'
import { SearchIcon } from '@/shared/icons/Icons'
import { IdentityResourceHeader } from './IdentityResourceLayout'

export function GroupsSection() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader
        eyebrow="Manage"
        title="Groups"
        description="Manage hierarchical Keycloak groups, their members, attributes, child groups, and inherited role mappings."
        actions={<Button size="sm" disabled title="Requires Keycloak group integration">Create group</Button>}
      />

      <div className="grid min-h-96 min-w-0 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface-subtle p-4 md:border-b-0 md:border-r" aria-label="Group hierarchy">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Group hierarchy</h3>
          <Input
            aria-label="Search groups"
            value={search}
            onChange={event => { setSearch(event.target.value) }}
            placeholder="Search groups"
            leadingIcon={<SearchIcon className="size-4" />}
          />
          <div className="mt-4">
            <EmptyState
              title="No groups connected"
              description={search ? `No connected Keycloak groups match “${search}”.` : 'The Keycloak group hierarchy is not connected yet.'}
            />
          </div>
        </aside>

        <section className="p-4" aria-label="Selected group workspace">
          <EmptyState
            title="No group selected"
            description="Select a connected Keycloak group to manage members, role mappings, attributes, and child groups."
          />
        </section>
      </div>
    </div>
  )
}
