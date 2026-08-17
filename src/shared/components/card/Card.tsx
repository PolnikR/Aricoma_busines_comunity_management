import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface CardProps {
  children?: ReactNode
  className?: string
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-[20px] border border-border bg-surface p-4 shadow-[0_14px_35px_-28px_rgba(37,72,112,0.45)] sm:p-5', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardTitleProps) {
  return <h2 className={cn('mb-1 text-base font-semibold text-text-primary', className)}>{children}</h2>
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return <p className={cn('text-sm text-text-muted', className)}>{children}</p>
}
