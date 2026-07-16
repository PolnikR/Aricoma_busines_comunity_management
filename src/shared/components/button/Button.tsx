import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  size?: 'sm' | 'md' | 'icon'
  variant?: 'primary' | 'outline' | 'ghost'
  startIcon?: ReactNode
  endIcon?: ReactNode
}

export function Button({
  children,
  size = 'md',
  variant = 'primary',
  startIcon,
  endIcon,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    icon: 'size-10 p-0',
  }

  const variantClasses = {
    primary: 'bg-[#1268f3] text-white shadow-[0_10px_24px_-12px_rgba(18,104,243,0.9)] hover:bg-[#0b57da] disabled:bg-[#9cbcf2]',
    outline: 'border border-[#cfdfef] bg-white text-[#40516c] shadow-sm hover:border-[#abd5f2] hover:bg-[#f5faff] hover:text-[#087fca]',
    ghost: 'bg-transparent text-[#66758f] hover:bg-[#eef7ff] hover:text-[#087fca]',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1596dd]/15',
        sizeClasses[size],
        variantClasses[variant],
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
