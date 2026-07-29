import type { ButtonHTMLAttributes, ReactNode } from 'react'
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
        'flex min-h-36 w-full flex-col rounded-lg border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1596dd]/15 disabled:cursor-not-allowed disabled:border-[#e3eaf2] disabled:bg-[#f6f8fb] disabled:opacity-60',
        selected
          ? 'border-[#0d91d7] bg-[#eef8fe] shadow-[0_10px_24px_-18px_rgba(13,145,215,0.8)]'
          : 'border-[#d9e6f1] bg-white hover:border-[#abd5f2] hover:bg-[#f8fbfe]',
        className,
      )}
      {...props}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-[#18253d]">{title}</span>
        {icon ? <span className="shrink-0 text-[#0d91d7]">{icon}</span> : null}
      </span>
      <span className="mt-2 text-xs leading-5 text-[#71819a]">{description}</span>
      {meta ? <span className="mt-auto pt-4 text-xs font-medium text-[#52627b]">{meta}</span> : null}
    </button>
  )
}
