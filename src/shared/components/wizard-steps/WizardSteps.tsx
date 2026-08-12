import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export interface WizardStepItem {
  id: string
  label: ReactNode
  disabled?: boolean
}

interface WizardStepsProps {
  items: WizardStepItem[]
  currentStep: number
  ariaLabel: string
  onStepChange?: (step: number) => void
}

export function WizardSteps({
  items,
  currentStep,
  ariaLabel,
  onStepChange,
}: WizardStepsProps) {
  return (
    <ol
      className="flex min-w-0 gap-2 overflow-x-auto p-4 lg:flex-col lg:gap-1 lg:overflow-x-hidden"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const number = index + 1
        const complete = number < currentStep
        const active = number === currentStep
        const disabled = item.disabled ?? false
        const isLast = index === items.length - 1

        return (
          <li key={item.id} className="relative min-w-max lg:min-w-0">
            {!isLast ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-5 top-8 -bottom-1 hidden w-px lg:block',
                  complete ? 'bg-success-500' : 'bg-border-strong',
                )}
              />
            ) : null}
            <button
              type="button"
              aria-current={active ? 'step' : undefined}
              disabled={disabled}
              onClick={() => { onStepChange?.(number) }}
              className={cn(
                'relative flex min-w-0 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                active
                  ? 'cursor-pointer bg-accent-soft font-semibold text-accent'
                  : disabled
                    ? 'cursor-not-allowed text-text-subtle'
                    : 'cursor-pointer text-text-muted hover:bg-surface-muted hover:text-accent',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-surface',
                  complete
                    ? 'bg-success-500 text-white'
                    : active
                      ? 'bg-accent text-white'
                      : 'bg-surface-muted text-text-muted',
                )}
              >
                {complete ? '✓' : number}
              </span>
              <span className="min-w-0 break-words">{item.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
