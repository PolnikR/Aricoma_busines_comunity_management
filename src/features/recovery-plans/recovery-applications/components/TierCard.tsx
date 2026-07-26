import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input } from '@/shared/components/form/FormControls'
import { slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: { name: string; description: string }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
  onVMAdded?: (vmName: string) => void
  onVMRemoved?: (vmName: string) => void
}

interface EditFormState {
  editId: string
  editName: string
  editDescription: string
  idError: string
  nameError: string
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
    editName: tier.name,
    editDescription: tier.description,
    idError: '',
    nameError: '',
  })

  useEffect(() => {
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditForm({
        editId: id,
        editName: tier.name,
        editDescription: tier.description,
        idError: '',
        nameError: '',
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

  const handleNameChange = (value: string) => {
    setEditForm(prev => {
      const newForm = { ...prev, editName: value }
      if (!prev.editId || prev.editId === slugify(prev.editName)) {
        newForm.editId = slugify(value)
      }
      return newForm
    })
  }

  const handleConfirm = () => {
    let hasError = false
    let newIdError = ''
    let newNameError = ''

    if (!editForm.editName.trim()) {
      newNameError = t('recovery.tier.validation.nameRequired')
      hasError = true
    }

    if (!editForm.editId.trim()) {
      newIdError = t('recovery.tier.validation.idRequired')
      hasError = true
    } else if (editForm.editId !== id && existingIds.includes(editForm.editId)) {
      newIdError = t('recovery.tier.validation.idInUse')
      hasError = true
    }

    if (hasError) {
      setEditForm(prev => ({
        ...prev,
        idError: newIdError,
        nameError: newNameError,
      }))
    } else {
      const newId = editForm.editId.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_')
      onSave?.(id, newId, { name: editForm.editName.trim(), description: editForm.editDescription.trim() })
    }
  }

  if (isEditing) {
    return (
      <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <Field label={t('recovery.tier.form.id')} htmlFor={`tier-${id}-edit-id`}>
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
            />
            {editForm.idError && <p className="text-xs text-red-600 mt-1">{editForm.idError}</p>}
          </Field>

          <Field label={t('recovery.tier.form.name')} htmlFor={`tier-${id}-edit-name`}>
            <Input
              id={`tier-${id}-edit-name`}
              type="text"
              value={editForm.editName}
              onChange={e => {
                handleNameChange(e.target.value)
              }}
              size="sm"
              invalid={Boolean(editForm.nameError)}
              placeholder={t('recovery.tier.form.namePlaceholder')}
            />
            {editForm.nameError && <p className="text-xs text-red-600 mt-1">{editForm.nameError}</p>}
          </Field>

          <Field label={t('recovery.tier.form.description')} htmlFor={`tier-${id}-edit-description`}>
            <textarea
              id={`tier-${id}-edit-description`}
              value={editForm.editDescription}
              onChange={e => {
                setEditForm(prev => ({ ...prev, editDescription: e.target.value }))
              }}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder={t('recovery.tier.form.descriptionPlaceholder')}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7bc4] transition"
            >
              {t('recovery.tier.confirm')}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 bg-white text-[#40516c] text-sm font-semibold rounded-md border border-[#cfdfef] shadow-sm hover:border-[#abd5f2] hover:bg-[#f5faff] transition"
            >
              {t('recovery.tier.cancel')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-dashed border-[#d9e6f1] rounded-lg flex flex-col overflow-hidden min-w-70 shadow-sm">
      <button
        onClick={() => {
          handleEditToggleClick(id)
        }}
        className="px-4 py-3 border-b border-[#edf2f7] bg-[#fbfdff] text-left hover:bg-[#f0f5fa] transition"
      >
        <div className="text-xs text-[#7b8ca4] font-semibold uppercase tracking-wider mb-1">
          {t('recovery.tier.order')}: <span className="font-bold">{tier.order}</span>
        </div>
        <div className="text-sm font-semibold text-[#18253d] mb-1">{tier.name}</div>
        <div className="text-xs text-[#71819a]">{tier.description}</div>
      </button>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-3 min-h-75 flex flex-col gap-2 transition-all ${
          isDragOver ? 'bg-[#e3edf6] border-t border-blue-light-500' : 'bg-[#f8fbfe]'
        }`}
      >
        {tier.vms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#91a4bc]">
            {t('recovery.tier.dragVmsHere')}
          </div>
        ) : (
          tier.vms.map(vm => (
            <div
              key={vm.name}
              className="p-2 bg-white border border-[#d9e6f1] rounded-md text-xs text-[#18253d] flex items-center justify-between group hover:border-[#b9d5e8]"
            >
              <span>{vm.name}</span>
              <button
                onClick={() => {
                  handleVMRemoveClick(vm.name)
                }}
                className="text-[#91a4bc] hover:text-[#d4353d] opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('recovery.tier.removeVm')}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#edf2f7] bg-[#fbfdff] flex gap-2">
        <button
          onClick={() => {
            handleEditToggleClick(id)
          }}
          className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7ab5] transition"
        >
          {t('buttons.edit')}
        </button>
        <button
          onClick={() => {
            handleDeleteClick(id)
          }}
          disabled={!canDelete}
          className="flex-1 px-3 py-1.5 bg-white text-[#40516c] text-sm font-semibold rounded-md border border-[#cfdfef] shadow-sm hover:border-[#abd5f2] hover:bg-[#f5faff] transition disabled:opacity-50 disabled:cursor-not-allowed"
          title={!canDelete ? t('recovery.tier.validation.cannotDeleteLastTier') : t('recovery.tier.validation.deleteThisTier')}
        >
          {t('buttons.delete')}
        </button>
      </div>
    </div>
  )
}
