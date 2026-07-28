import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: {
    tierDescription: string
    recoveryGroupName: string
    recoveryGroupDescription: string
  }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
  onVMAdded?: (vmName: string) => void
  onVMRemoved?: (vmName: string) => void
}

interface EditFormState {
  editId: string
  editRecoveryGroupName: string
  editTierDescription: string
  editRecoveryGroupDescription: string
  idError: string
  tierDescriptionError: string
  recoveryGroupNameError: string
  recoveryGroupDescriptionError: string
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
  onVMAdded,
  onVMRemoved,
}: TierCardProps) {
  const { t } = useTranslation()
  const [isDragOver, setIsDragOver] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState>({
    editId: id,
    editRecoveryGroupName: tier.recovery_group?.name ?? '',
    editTierDescription: tier.description,
    editRecoveryGroupDescription: tier.recovery_group?.description ?? '',
    idError: '',
    tierDescriptionError: '',
    recoveryGroupNameError: '',
    recoveryGroupDescriptionError: '',
  })

  useEffect(() => {
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditForm({
        editId: id,
        editRecoveryGroupName: tier.recovery_group?.name ?? '',
        editTierDescription: tier.description,
        editRecoveryGroupDescription: tier.recovery_group?.description ?? '',
        idError: '',
        tierDescriptionError: '',
        recoveryGroupNameError: '',
        recoveryGroupDescriptionError: '',
      })
    }
  }, [isEditing, id, tier])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const vmName = e.dataTransfer.getData('vm-name')
    if (vmName) {
      onVMAdded?.(vmName)
    }
  }

  const handleEditToggleClick = (tierId: string) => {
    onEditToggle?.(tierId)
  }

  const handleDeleteClick = (tierId: string) => {
    onDelete?.(tierId)
  }

  const handleVMRemoveClick = (vmName: string) => {
    onVMRemoved?.(vmName)
  }

  const handleRecoveryGroupNameChange = (value: string) => {
    setEditForm(prev => ({ ...prev, editRecoveryGroupName: value }))
  }

  const handleConfirm = () => {
    let hasError = false
    let newIdError = ''
    let newTierDescriptionError = ''
    let newRecoveryGroupNameError = ''
    let newRecoveryGroupDescriptionError = ''

    if (!editForm.editId.trim()) {
      newIdError = t('recovery.tier.validation.idRequired')
      hasError = true
    } else if (editForm.editId !== id && existingIds.includes(editForm.editId)) {
      newIdError = t('recovery.tier.validation.idInUse')
      hasError = true
    }

    if (!editForm.editTierDescription.trim()) {
      newTierDescriptionError = 'Tier description is required'
      hasError = true
    }

    if (!editForm.editRecoveryGroupName.trim()) {
      newRecoveryGroupNameError = 'Recovery group name is required'
      hasError = true
    }

    if (!editForm.editRecoveryGroupDescription.trim()) {
      newRecoveryGroupDescriptionError = 'Recovery group description is required'
      hasError = true
    }

    if (hasError) {
      setEditForm(prev => ({
        ...prev,
        idError: newIdError,
        tierDescriptionError: newTierDescriptionError,
        recoveryGroupNameError: newRecoveryGroupNameError,
        recoveryGroupDescriptionError: newRecoveryGroupDescriptionError,
      }))
    } else {
      const newId = editForm.editId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
      onSave?.(id, newId, {
        tierDescription: editForm.editTierDescription.trim(),
        recoveryGroupName: editForm.editRecoveryGroupName.trim(),
        recoveryGroupDescription: editForm.editRecoveryGroupDescription.trim(),
      })
    }
  }

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

          <Field label="Tier description *" htmlFor={`tier-${id}-edit-tier-description`}>
            <Textarea
              id={`tier-${id}-edit-tier-description`}
              value={editForm.editTierDescription}
              onChange={e => {
                setEditForm(prev => ({ ...prev, editTierDescription: e.target.value }))
              }}
              className="resize-none"
              rows={3}
              invalid={Boolean(editForm.tierDescriptionError)}
              placeholder="Tier description"
              required
            />
            {editForm.tierDescriptionError && <p className="text-xs text-red-600 mt-1">{editForm.tierDescriptionError}</p>}
          </Field>

          <Field label="Recovery group name *" htmlFor={`tier-${id}-edit-recovery-group-name`}>
            <Input
              id={`tier-${id}-edit-recovery-group-name`}
              type="text"
              value={editForm.editRecoveryGroupName}
              onChange={e => {
                handleRecoveryGroupNameChange(e.target.value)
              }}
              size="sm"
              invalid={Boolean(editForm.recoveryGroupNameError)}
              placeholder="recovery_group"
              required
            />
            {editForm.recoveryGroupNameError && <p className="text-xs text-red-600 mt-1">{editForm.recoveryGroupNameError}</p>}
          </Field>

          <Field label="Recovery group description *" htmlFor={`tier-${id}-edit-recovery-group-description`}>
            <Textarea
              id={`tier-${id}-edit-recovery-group-description`}
              value={editForm.editRecoveryGroupDescription}
              onChange={e => {
                setEditForm(prev => ({ ...prev, editRecoveryGroupDescription: e.target.value }))
              }}
              className="resize-none"
              rows={3}
              invalid={Boolean(editForm.recoveryGroupDescriptionError)}
              placeholder="Recovery group description"
              required
            />
            {editForm.recoveryGroupDescriptionError && <p className="text-xs text-red-600 mt-1">{editForm.recoveryGroupDescriptionError}</p>}
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
        {tier.recovery_group ? (
          <div className="mt-2 text-xs text-[#52627b]">
            Recovery group: <span className="font-semibold">{tier.recovery_group.name}</span>
          </div>
        ) : null}
      </button>

      {tier.recovery_group ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex h-60 min-h-60 flex-col gap-2 p-3 transition-all ${
            isDragOver ? 'bg-[#e3edf6] border-t border-blue-light-500' : 'bg-[#f8fbfe]'
          }`}
        >
          <div className="shrink-0 text-xs text-[#71819a]">{tier.recovery_group.description}</div>
          {tier.recovery_group.vms.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-xs text-[#91a4bc]">
              {t('recovery.tier.dragVmsHere')}
            </div>
          ) : (
            <div
              className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
              tabIndex={0}
              aria-label={`${tier.recovery_group.name} virtual machines`}
            >
              {tier.recovery_group.vms.map(vm => (
                <div
                  key={vm.name}
                  className="group flex items-center justify-between rounded-md border border-[#d9e6f1] bg-white p-2 text-xs text-[#18253d] hover:border-[#b9d5e8]"
                >
                  <span>{vm.name}</span>
                  <button
                    onClick={() => {
                      handleVMRemoveClick(vm.name)
                    }}
                    className="text-[#91a4bc] opacity-0 transition-opacity hover:text-[#d4353d] group-hover:opacity-100 focus:opacity-100"
                    title={t('recovery.tier.removeVm')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="px-4 py-3 border-t border-[#edf2f7] bg-[#fbfdff] flex gap-2">
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
