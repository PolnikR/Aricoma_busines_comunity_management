import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { routes } from '@/app/routes'
import { useUnsavedChangesGuard } from '../../recovery-applications/hooks/useUnsavedChangesGuard'
import { RecoveryGroupBuilder } from '../components/RecoveryGroupBuilder'
import { useRecoveryGroups } from '../hooks/useRecoveryGroups'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

export function RecoveryGroupEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { groups, update } = useRecoveryGroups()
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigationGuard = useUnsavedChangesGuard(isDirty)
  const group = groups.find(item => item.id === id)

  const navigateToGroups = () => { void navigate(routes.recoveryGroups) }
  const requestBack = () => { navigationGuard.requestNavigation(navigateToGroups) }

  const handleUpdate = (draft: RecoveryGroupDraft) => {
    try {
      update(id, draft)
      setIsDirty(false)
      navigationGuard.runWithoutBlocking(navigateToGroups)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('pages.recoveryGroupEditor.error.update'))
    }
  }

  if (!group) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {t('pages.recoveryGroupEditor.error.notFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.recoveryGroupEditor.eyebrow')}
        title={t('pages.recoveryGroupEditor.title')}
        description={t('pages.recoveryGroupEditor.description')}
        actions={<Button size="sm" variant="outline" onClick={requestBack}>{t('buttons.back')}</Button>}
      />
      {error ? <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div> : null}
      <RecoveryGroupBuilder
        initialData={group}
        submitLabel={t('pages.recoveryGroupEditor.saveButton')}
        onCreate={handleUpdate}
        onCancel={requestBack}
        onDirtyChange={setIsDirty}
        existingIds={groups.map(item => item.id)}
      />
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('recovery.builder.discardDialog.title')}
        message={t('recovery.builder.discardDialog.message')}
        cancelLabel={t('recovery.builder.discardDialog.cancel')}
        confirmLabel={t('recovery.builder.discardDialog.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </div>
  )
}
