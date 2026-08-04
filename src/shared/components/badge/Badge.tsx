import type { ReactNode } from 'react'

type BadgeVariant = 'light' | 'solid'
type BadgeSize = 'sm' | 'md'
type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  color?: BadgeColor
  startIcon?: ReactNode
  endIcon?: ReactNode
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'light', color = 'primary', size = 'md', startIcon, endIcon, children, className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 font-medium'
  const sizeStyles = {
    sm: 'text-theme-xs',
    md: 'text-sm',
  }
  const variants = {
    light: {
      primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
      success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
      error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
      warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
      info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
      light: 'bg-surface-muted text-text-secondary',
      dark: 'bg-text-muted text-white',
    },
    solid: {
      primary: 'bg-brand-500 text-white dark:text-white',
      success: 'bg-success-500 text-white dark:text-white',
      error: 'bg-error-500 text-white dark:text-white',
      warning: 'bg-warning-500 text-white dark:text-white',
      info: 'bg-blue-light-500 text-white dark:text-white',
      light: 'bg-text-subtle text-white',
      dark: 'bg-text-secondary text-white',
    },
  }

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variants[variant][color]} ${className}`}>
      {startIcon ? <span className="mr-1">{startIcon}</span> : null}
      {children}
      {endIcon ? <span className="ml-1">{endIcon}</span> : null}
    </span>
  )
}
