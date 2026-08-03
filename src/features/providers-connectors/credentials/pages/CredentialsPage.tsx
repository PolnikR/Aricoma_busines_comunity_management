import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { useCredentials } from '../hooks/useCredentials'
import { CredentialCreateModal } from '../components/CredentialCreateModal'
import { CredentialsTable } from '../components/CredentialsTable'

export function CredentialsPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const { data = [], isLoading, isFetching, error, refetch } = useCredentials()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('credentials.page.eyebrow')}
        title={t('credentials.page.title')}
        description={t('credentials.page.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setCreateOpen(true) }}>
            {t('credentials.page.create')}
          </Button>
        )}
      />
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-3 lg:min-h-0">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <CredentialsTable
            credentials={data}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
      <CredentialCreateModal
        open={createOpen}
        existingCredentials={data}
        onClose={() => { setCreateOpen(false) }}
      />
    </div>
  )
}
