import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

type ControlSize = 'sm' | 'md'

interface FieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  leadingIcon?: ReactNode
  size?: ControlSize
  invalid?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  children: ReactNode
  size?: ControlSize
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  variant?: 'plain' | 'bordered'
}

const controlClassName = 'w-full min-w-0 max-w-full border border-[#cfdaea] bg-[#fcfdff] text-sm text-[#273750] shadow-sm outline-none transition placeholder:text-[#9aa8bc] focus:border-[#63bdf2] focus:bg-white focus:ring-4 focus:ring-[#1596dd]/10 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#8390a5]'
const controlSizeClassNames: Record<ControlSize, string> = {
  sm: 'h-8 rounded-md px-2',
  md: 'h-10 rounded-xl px-3',
}

export function Field({ label, htmlFor, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)} htmlFor={htmlFor}>
      <span className="mb-1.5 block text-xs font-medium text-[#50617a]">{label}</span>
      {children}
    </label>
  )
}

export function Input({
  leadingIcon,
  size = 'md',
  invalid = false,
  className,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  return (
    <div className="relative min-w-0 max-w-full">
      {leadingIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leadingIcon}</span> : null}
      <input
        aria-invalid={invalid ? true : ariaInvalid}
        className={cn(
          controlClassName,
          controlSizeClassNames[size],
          leadingIcon ? 'pl-10' : undefined,
          invalid ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : undefined,
          className
        )}
        {...props}
      />
    </div>
  )
}

export function Select({ children, size = 'md', className, ...props }: SelectProps) {
  return (
    <div className="relative min-w-0 max-w-full">
      <select className={cn(controlClassName, controlSizeClassNames[size], 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

export function CheckboxField({
  label,
  variant = 'plain',
  id,
  className,
  disabled,
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-[#273750]',
        variant === 'bordered' ? 'h-10 rounded-xl border border-[#cfdaea] bg-white px-3 text-xs text-[#52627a] shadow-sm' : undefined,
        disabled ? 'cursor-not-allowed opacity-60' : undefined,
        className,
      )}
      htmlFor={checkboxId}
    >
      <input
        {...props}
        id={checkboxId}
        type="checkbox"
        disabled={disabled}
        className="size-4 rounded border-[#cfdaea] accent-[#1268f3] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1596dd]/15"
      />
      <span>{label}</span>
    </label>
  )
}
