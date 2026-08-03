import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { isTierIdAvailable, slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: {
    tierDescription: string
  }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
  onRecoveryGroupAdded?: (groupId: string) => void
  onRecoveryGroupRemoved?: () => void
  recoveryGroupVms?: readonly string[]
  onRecoveryVmSelectionChange?: (vmName: string, selected: boolean) => void
}

interface EditFormState {
  editId: string
  editTierDescription: string
  idError: string
  tierDescriptionError: string
}

export function TierCard({
  id,
  tier,
  isEditing = false,
  onEditToggle,
  onSave,
  onDelete,
  onCancel,
  existingIds,
  canDelete,
  onRecoveryGroupAdded,
  onRecoveryGroupRemoved,
  recoveryGroupVms = [],
  onRecoveryVmSelectionChange,
}: TierCardProps) {
  const { t } = useTranslation()
  const [editForm, setEditForm] = useState<EditFormState>({
    editId: id,
    editTierDescription: tier.description,
    idError: '',
    tierDescriptionError: '',
  })

  useEffect(() => {
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditForm({
        editId: id,
        editTierDescription: tier.description,
        idError: '',
        tierDescriptionError: '',
      })
    }
  }, [isEditing, id, tier])

  const handleEditToggleClick = (tierId: string) => {
    onEditToggle?.(tierId)
  }

  const handleDeleteClick = (tierId: string) => {
    onDelete?.(tierId)
  }

  const handleConfirm = () => {
    let hasError = false
    let newIdError = ''
    let newTierDescriptionError = ''

    const newId = slugify(editForm.editId)

    if (!newId) {
      newIdError = t('recovery.tier.validation.idRequired')
      hasError = true
    } else if (!isTierIdAvailable(editForm.editId, existingIds, id)) {
      newIdError = t('recovery.tier.validation.idInUse')
      hasError = true
    }

    if (!editForm.editTierDescription.trim()) {
      newTierDescriptionError = t('recovery.tier.validation.tierDescriptionRequired')
      hasError = true
    }

    if (hasError) {
      setEditForm(prev => ({
        ...prev,
        idError: newIdError,
        tierDescriptionError: newTierDescriptionError,
      }))
    } else {
      onSave?.(id, newId, {
        tierDescription: editForm.editTierDescription.trim(),
      })
    }
  }

  const selectedVmNames = tier.recovery_group?.vms.map(vm => vm.name) ?? []
  const allVmNames = Array.from(new Set([...recoveryGroupVms, ...selectedVmNames]))
  const selectionSummary = t('recovery.tier.vmSelectionSummary')
    .replace('{selected}', String(selectedVmNames.length))
    .replace('{total}', String(allVmNames.length))

  if (isEditing) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-[#d9e6f1] bg-white p-4 shadow-sm">
        <div className="flex h-full flex-col gap-3">
          <Field label={`${t('recovery.tier.form.id')} *`} htmlFor={`tier-${id}-edit-id`}>
            <Input
              id={`tier-${id}-edit-id`}
              type="text"
              value={editForm.editId}
              onChange={e => {
                setEditForm(prev => ({ ...prev, editId: e.target.value }))
              }}
              size="sm"
              invalid={Boolean(editForm.idError)}
              placeholder={t('recovery.tier.form.idPlaceholder')}
              required
            />
            {editForm.idError && <p className="text-xs text-red-600 mt-1">{editForm.idError}</p>}
          </Field>

          <Field label={t('recovery.tier.form.tierDescription')} htmlFor={`tier-${id}-edit-tier-description`}>
            <Textarea
              id={`tier-${id}-edit-tier-description`}
              value={editForm.editTierDescription}
              onChange={e => {
                setEditForm(prev => ({ ...prev, editTierDescription: e.target.value }))
              }}
              className="resize-none"
              rows={3}
              invalid={Boolean(editForm.tierDescriptionError)}
              placeholder={t('recovery.tier.form.tierDescriptionPlaceholder')}
              required
            />
            {editForm.tierDescriptionError && <p className="text-xs text-red-600 mt-1">{editForm.tierDescriptionError}</p>}
          </Field>

          <div className="-mx-4 -mb-4 mt-auto flex gap-2 border-t border-[#edf2f7] bg-[#fbfdff] px-4 py-3">
            <Button
              onClick={handleConfirm}
              size="sm"
              className="flex-1"
            >
              {t('recovery.tier.confirm')}
            </Button>
            <Button
              onClick={onCancel}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              {t('recovery.tier.cancel')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-70 flex-col overflow-hidden rounded-lg border-2 border-dashed border-[#d9e6f1] bg-white shadow-sm">
      <button
        onClick={() => {
          handleEditToggleClick(id)
        }}
        className="px-4 py-3 border-b border-[#edf2f7] bg-[#fbfdff] text-left hover:bg-[#f0f5fa] transition"
      >
        <div className="text-xs text-[#7b8ca4] font-semibold uppercase tracking-wider mb-1">
          {t('recovery.tier.order')}: <span className="font-bold">{tier.order}</span>
        </div>
        <div className="text-sm font-semibold text-[#18253d] mb-1">{id}</div>
        <div className="text-xs text-[#71819a]">{tier.description}</div>
      </button>

      {tier.recovery_group ? (
        <ResourceSelectionCard
          title={`${t('recovery.tier.recoveryGroup')}: ${tier.recovery_group.name}`}
          titleVariant="inline"
          items={allVmNames}
          selectedItems={selectedVmNames}
          emptyText={t('recovery.tier.emptyRecoveryGroup')}
          removeLabel={t('recovery.tier.removeVm')}
          ariaLabel={`${tier.recovery_group.name} virtual machines`}
          selectionSummary={selectionSummary}
          dropDataKey="recovery-group-id"
          onResourceDrop={groupId => { onRecoveryGroupAdded?.(groupId) }}
          {...(onRecoveryVmSelectionChange ? {
            onResourceSelectionChange: onRecoveryVmSelectionChange,
          } : {})}
          clearLabel={t('recovery.tier.removeRecoveryGroup')}
          {...(onRecoveryGroupRemoved ? { onClear: onRecoveryGroupRemoved } : {})}
        />
      ) : (
        <ResourceSelectionCard
          items={[]}
          emptyText={t('recovery.tier.dragRecoveryGroupHere')}
          removeLabel={t('recovery.tier.removeRecoveryGroup')}
          ariaLabel={t('recovery.tier.emptyRecoveryGroupAriaLabel')}
          dropDataKey="recovery-group-id"
          onResourceDrop={groupId => { onRecoveryGroupAdded?.(groupId) }}
        />
      )}

      <div className="mt-auto flex gap-2 border-t border-[#edf2f7] bg-[#fbfdff] px-4 py-3">
        <Button
          onClick={() => {
            handleEditToggleClick(id)
          }}
          size="sm"
          className="flex-1"
        >
          {t('buttons.edit')}
        </Button>
        <Button
          onClick={() => {
            handleDeleteClick(id)
          }}
          disabled={!canDelete}
          size="sm"
          variant="danger"
          className="flex-1"
          title={!canDelete ? t('recovery.tier.validation.cannotDeleteLastTier') : t('recovery.tier.validation.deleteThisTier')}
        >
          {t('buttons.delete')}
        </Button>
      </div>
    </div>
  )
}
