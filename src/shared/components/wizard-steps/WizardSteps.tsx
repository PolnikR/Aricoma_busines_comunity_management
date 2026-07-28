import type { ReactNode } from 'react'

export interface WizardStepItem {
  id: string
  label: ReactNode
}

interface WizardStepsProps {
  items: WizardStepItem[]
  currentStep: number
  ariaLabel: string
}

export function WizardSteps({ items, currentStep, ariaLabel }: WizardStepsProps) {
  return (
    <ol
      className="flex gap-2 overflow-x-auto p-4 lg:flex-col lg:gap-1"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const number = index + 1
        const complete = number < currentStep
        const active = number === currentStep

        return (
          <li
            key={item.id}
            aria-current={active ? 'step' : undefined}
            className={`flex min-w-max items-center gap-3 rounded-lg px-3 py-3 text-sm ${
              active ? 'bg-[#eef8fe] font-semibold text-[#087fca]' : 'text-[#66758f]'
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
          </li>
        )
      })}
    </ol>
  )
}
