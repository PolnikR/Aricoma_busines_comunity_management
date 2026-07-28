import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { RecoveryGroupsTable } from '../components/RecoveryGroupsTable'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'

export function RecoveryGroupsListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groups } = useRecoveryGroups()
  const navigateToCreate = () => { void navigate(`${routes.recoveryGroups}/create`) }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.recoveryGroups.eyebrow')}
        title={t('pages.recoveryGroups.title')}
        description={t('pages.recoveryGroups.description')}
        actions={
          <Button size="sm" variant="outline" onClick={navigateToCreate}>
            {t('pages.recoveryGroups.createButton')}
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-3 lg:min-h-0">
        {groups.length === 0 ? (
          <EmptyState
            title={t('pages.recoveryGroups.empty.title')}
            description={t('pages.recoveryGroups.empty.description')}
            action={
              <Button onClick={navigateToCreate}>
                {t('pages.recoveryGroups.empty.createButton')}
              </Button>
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#dbe7f2] bg-white shadow-sm">
            <RecoveryGroupsTable groups={groups} />
          </div>
        )}
      </div>
    </div>
  )
}
