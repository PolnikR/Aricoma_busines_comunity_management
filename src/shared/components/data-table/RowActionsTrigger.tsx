import type { ButtonHTMLAttributes } from 'react'

type RowActionsTriggerProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>

export function RowActionsTrigger(props: RowActionsTriggerProps) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      {...props}
      className="group/row-actions inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md border border-border-strong bg-surface text-text-secondary transition-colors group-hover/row-actions:border-accent group-hover/row-actions:bg-accent-soft group-hover/row-actions:text-accent group-aria-expanded/row-actions:border-accent group-aria-expanded/row-actions:bg-accent-soft group-aria-expanded/row-actions:text-accent"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
        </svg>
      </span>
    </button>
  )
}
