import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDownIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface FieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
}

const controlClassName = 'h-10 w-full rounded-xl border border-[#cfdaea] bg-[#fcfdff] px-3 text-sm text-[#273750] shadow-sm outline-none transition placeholder:text-[#9aa8bc] focus:border-[#63bdf2] focus:bg-white focus:ring-4 focus:ring-[#1596dd]/10 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] disabled:text-[#8390a5]'

export function Field({ label, htmlFor, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)} htmlFor={htmlFor}>
      <span className="mb-1.5 block text-xs font-medium text-[#50617a]">{label}</span>
      {children}
    </label>
  )
}

export function Input({ leadingIcon, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {leadingIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leadingIcon}</span> : null}
      <input className={cn(controlClassName, leadingIcon ? 'pl-10' : undefined, className)} {...props} />
    </div>
  )
}

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(controlClassName, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
    </div>
  )
}
