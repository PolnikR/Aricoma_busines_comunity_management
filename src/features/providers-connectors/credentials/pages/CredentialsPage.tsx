import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { useCredentials } from '../api/useCredentials'
import { CredentialCreateModal } from '../components/CredentialCreateModal'
import { CredentialsTable } from '../components/CredentialsTable'

export function CredentialsPage() {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const { data = [], isFetching, refetch } = useCredentials()

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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#dbe7f2] bg-white shadow-sm">
          <CredentialsTable />
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
