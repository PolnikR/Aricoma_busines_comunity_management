import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { isTierIdAvailable, slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface AddTierCardProps {
  onAdd?: (id: string, tier: RecoveryTier) => void
  maxOrder: number
  existingIds: string[]
}

export function AddTierCard({ onAdd, maxOrder, existingIds }: AddTierCardProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [id, setId] = useState('')
  const [tierDescription, setTierDescription] = useState('')

  const normalizedId = slugify(id)
  const isValidId = isTierIdAvailable(id, existingIds)
  const canCreate = Boolean(
    isValidId
    && tierDescription.trim()
  )

  const handleCreate = () => {
    if (!canCreate) return

    const newTier: RecoveryTier = {
      description: tierDescription.trim(),
      order: maxOrder + 1,
    }

    onAdd?.(normalizedId, newTier)
    setIsOpen(false)
    setId('')
    setTierDescription('')
  }

  const handleCancel = () => {
    setIsOpen(false)
    setId('')
    setTierDescription('')
  }

  if (isOpen) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <Field label={`${t('recovery.tier.form.id')} *`} htmlFor="add-tier-id">
            <Input
              id="add-tier-id"
              type="text"
              value={id}
              onChange={e => {
                setId(e.target.value)
              }}
              size="sm"
              invalid={Boolean(!isValidId && id)}
              placeholder={t('recovery.tier.form.idPlaceholder')}
              required
            />
            {!isValidId && id && (
              <p className="text-xs text-red-600 mt-1">{t('recovery.tier.validation.idInvalid')}</p>
            )}
          </Field>

          <Field label={t('recovery.tier.form.tierDescription')} htmlFor="add-tier-description">
            <Textarea
              id="add-tier-description"
              value={tierDescription}
              onChange={e => {
                setTierDescription(e.target.value)
              }}
              className="resize-none"
              rows={3}
              placeholder={t('recovery.tier.form.tierDescriptionPlaceholder')}
              required
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={!canCreate}
              size="sm"
              className="flex-1"
            >
              {t('buttons.create')}
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              {t('buttons.cancel')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setIsOpen(true)
      }}
      className="bg-surface border-2 border-dashed border-border-strong rounded-lg p-4 shadow-sm hover:border-border-strong hover:bg-surface-subtle transition flex items-center justify-center h-full"
    >
      <span className="text-3xl text-text-muted">+</span>
    </button>
  )
}
