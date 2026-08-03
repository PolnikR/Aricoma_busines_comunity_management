import type { ReactNode } from 'react'

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
      className="flex gap-2 overflow-x-auto p-4 lg:flex-col lg:gap-1"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const number = index + 1
        const complete = number < currentStep
        const active = number === currentStep
        const disabled = item.disabled ?? false

        return (
          <li
            key={item.id}
            className="min-w-max"
          >
            <button
              type="button"
              aria-current={active ? 'step' : undefined}
              disabled={disabled}
              onClick={() => { onStepChange?.(number) }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                active
                  ? 'cursor-pointer bg-accent-soft font-semibold text-accent'
                  : disabled
                    ? 'cursor-not-allowed text-text-subtle'
                    : 'cursor-pointer text-text-muted hover:bg-surface-muted hover:text-accent'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  complete || active ? 'bg-accent text-white' : 'bg-surface-muted text-text-muted'
                }`}
              >
                {complete ? '✓' : number}
              </span>
              {item.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
