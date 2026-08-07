interface SpinnerProps {
  className?: string
}

export function Spinner({ className = 'size-3.5' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  )
}
