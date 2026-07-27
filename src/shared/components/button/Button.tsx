import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'icon'
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'soft' | 'ghost'
  startIcon?: ReactNode
  endIcon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  children,
  size = 'md',
  variant = 'primary',
  startIcon,
  endIcon,
  fullWidth = false,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeClasses = {
    xs: 'h-7 rounded px-3 text-xs',
    sm: 'h-9 rounded-lg px-3 text-sm',
    md: 'h-11 rounded-lg px-4 text-sm',
    icon: 'size-10 rounded-xl p-0',
  }

  const variantClasses = {
    primary: 'bg-[#0d91d7] text-white shadow-[0_10px_24px_-12px_rgba(13,145,215,0.9)] hover:bg-[#0a7bc4] disabled:bg-gray-400',
    secondary: 'border border-[#d9e6f1] bg-[#f0f5fa] text-[#18253d] hover:bg-[#e3edf6]',
    outline: 'border border-[#cfdfef] bg-white text-[#40516c] shadow-sm hover:border-[#abd5f2] hover:bg-[#f5faff] hover:text-[#087fca]',
    danger: 'border border-[#f0c3c3] bg-white text-red-600 hover:bg-red-50',
    soft: 'bg-[#eef4f9] text-[#0d91d7] hover:bg-[#e3edf6]',
    ghost: 'bg-transparent text-[#66758f] hover:bg-[#eef7ff] hover:text-[#087fca]',
  }

  const fontWeight = variant === 'primary' ? 'font-semibold' : 'font-medium'

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1596dd]/15',
        fontWeight,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : undefined,
        disabled ? 'cursor-not-allowed opacity-50' : undefined,
        className,
      )}
      disabled={disabled}
      type={type}
      {...props}
    >
      {startIcon ? <span className="flex items-center">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="flex items-center">{endIcon}</span> : null}
    </button>
  )
}
