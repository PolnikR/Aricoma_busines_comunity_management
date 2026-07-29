import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CheckIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface SelectableCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected: boolean
  title: string
  description: string
  icon?: ReactNode
  meta?: ReactNode
}

export function SelectableCard({
  selected,
  title,
  description,
  icon,
  meta,
  className,
  ...props
}: SelectableCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'group relative flex min-h-36 w-full flex-col overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1596dd]/20 disabled:cursor-not-allowed disabled:border-[#dfe7ef] disabled:bg-[#f3f6f9] disabled:opacity-55 disabled:shadow-none',
        selected
          ? 'border-[#0d91d7] bg-gradient-to-br from-white via-[#f4fbff] to-[#e8f6fe] shadow-[0_16px_34px_-20px_rgba(13,145,215,0.75),0_6px_14px_-10px_rgba(27,63,94,0.35)]'
          : 'border-[#d7e4ef] bg-gradient-to-br from-white to-[#f8fbfe] shadow-[0_12px_30px_-24px_rgba(31,59,91,0.75)] hover:-translate-y-0.5 hover:border-[#8bc9ed] hover:shadow-[0_18px_34px_-22px_rgba(31,96,139,0.55)]',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-1 origin-left bg-[#0d91d7] transition-transform duration-200',
          selected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        )}
      />
      <span className="flex items-start justify-between gap-3">
        <span className="text-[15px] font-semibold leading-5 text-[#17233d]">{title}</span>
        {selected ? (
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0d91d7] text-white shadow-sm"
          >
            <CheckIcon className="size-4" />
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 max-w-[90%] text-xs leading-5 text-[#657792]">{description}</span>
      <span className="mt-auto flex min-h-7 items-end justify-between gap-3 pt-3">
        {meta ? (
          <span className="rounded-md border border-[#d8e8f4] bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#526781] shadow-sm">
            {meta}
          </span>
        ) : <span />}
        {icon ? (
          <span
            aria-hidden="true"
            data-testid="selectable-card-logo"
            className="ml-auto shrink-0 text-[#38536e] opacity-80 transition group-hover:opacity-100"
          >
            {icon}
          </span>
        ) : null}
      </span>
    </button>
  )
}
