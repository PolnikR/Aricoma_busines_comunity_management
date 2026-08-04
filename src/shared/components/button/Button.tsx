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
    primary: 'bg-accent text-white shadow-[0_10px_24px_-12px_rgba(13,145,215,0.9)] hover:bg-accent-hover disabled:bg-text-subtle',
    secondary: 'border border-border bg-surface-muted text-text-primary hover:bg-surface-muted',
    outline: 'border border-border-strong bg-surface text-text-secondary shadow-sm hover:border-accent hover:bg-surface-subtle hover:text-accent',
    danger: 'border border-error-200 bg-surface text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-500/10',
    soft: 'bg-surface-muted text-accent hover:bg-surface-muted',
    ghost: 'bg-transparent text-text-muted hover:bg-accent-soft hover:text-accent',
  }

  const fontWeight = variant === 'primary' ? 'font-semibold' : 'font-medium'

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15',
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
