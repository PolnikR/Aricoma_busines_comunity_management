import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Input } from '@/shared/components/form/FormControls'
import { SearchIcon } from '@/shared/icons/Icons'
import { IdentityContentPanel } from './IdentityResourceLayout'

export function GroupsSection() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  return (
    <IdentityContentPanel>
      <div className="grid min-h-96 min-w-0 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface-subtle p-4 md:border-b-0 md:border-r" aria-label={t('identity.groups.hierarchy.ariaLabel')}>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t('identity.groups.hierarchy.title')}</h3>
          <Input
            aria-label={t('identity.groups.search')}
            value={search}
            onChange={event => { setSearch(event.target.value) }}
            placeholder={t('identity.groups.search')}
            leadingIcon={<SearchIcon className="size-4" />}
          />
          <div className="mt-4">
            <EmptyState
              title={t('identity.groups.empty.title')}
              description={search ? t('identity.groups.empty.filtered', { search }) : t('identity.groups.empty.description')}
            />
          </div>
        </aside>

        <section className="p-4" aria-label={t('identity.groups.workspace.ariaLabel')}>
          <EmptyState
            title={t('identity.groups.workspace.emptyTitle')}
            description={t('identity.groups.workspace.emptyDescription')}
          />
        </section>
      </div>
    </IdentityContentPanel>
  )
}
