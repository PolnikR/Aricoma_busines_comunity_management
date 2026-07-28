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
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1596dd] ${
                active
                  ? 'cursor-pointer bg-[#eef8fe] font-semibold text-[#087fca]'
                  : disabled
                    ? 'cursor-not-allowed text-[#a5b0c0]'
                    : 'cursor-pointer text-[#66758f] hover:bg-[#f0f5fa] hover:text-[#087fca]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  complete || active ? 'bg-[#0d91d7] text-white' : 'bg-[#edf2f7] text-[#71819a]'
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
