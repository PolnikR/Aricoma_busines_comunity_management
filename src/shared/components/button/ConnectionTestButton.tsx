import { useId } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { PlugIcon } from '@/shared/icons/Icons'
import { Button } from './Button'

interface ConnectionTestButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function ConnectionTestButton({ onClick, disabled = false }: ConnectionTestButtonProps) {
  const { t } = useTranslation()
  const hintId = useId()
  const disabledReason = t('providers.connectionTest.credentialRequired')

  return (
    <>
      <Button
        size="xs"
        variant="soft"
        className="border border-accent/30 bg-accent-soft text-accent shadow-none hover:border-accent hover:bg-accent-soft hover:text-accent"
        startIcon={<PlugIcon className="size-3.5" />}
        onClick={onClick}
        disabled={disabled}
        aria-describedby={disabled ? hintId : undefined}
        title={disabled ? disabledReason : undefined}
      >
        {t('providers.connectionTest.button')}
      </Button>
      {disabled ? <span id={hintId} className="sr-only">{disabledReason}</span> : null}
    </>
  )
}
