import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/shared/utils/cn'

interface TopologyNodeShellProps {
  kindLabel: string
  title: string
  subtitle: string
  icon: ReactNode
  iconClassName: string
  selected: boolean
  showTargetHandle?: boolean
  showSourceHandle?: boolean
  children: ReactNode
}

export function TopologyNodeShell({
  kindLabel,
  title,
  subtitle,
  icon,
  iconClassName,
  selected,
  showTargetHandle = false,
  showSourceHandle = false,
  children,
}: TopologyNodeShellProps) {
  return (
    <div
      className={cn(
        'relative flex size-full flex-col overflow-hidden rounded-xl border bg-white shadow-[0_10px_28px_-18px_rgba(31,70,112,0.5)] transition',
        selected
          ? 'border-brand-400 ring-4 ring-brand-100'
          : 'border-[#d9e6f1] hover:border-[#b9d5e8]',
      )}
      role="group"
      aria-label={`${kindLabel}: ${title}`}
    >
      {showTargetHandle ? (
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          className="!size-2.5 !border-2 !border-white !bg-[#91a4bc]"
        />
      ) : null}

      <div className="flex min-w-0 items-start gap-3 px-3.5 pb-2 pt-3">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', iconClassName)}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7b8ca4]">
            {kindLabel}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-[#18253d]" title={title}>
            {title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[#71819a]" title={subtitle}>
            {subtitle}
          </span>
        </span>
      </div>

      <div className="mt-auto border-t border-[#edf2f7] bg-[#fbfdff] px-3.5 py-2">
        {children}
      </div>

      {showSourceHandle ? (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={false}
          className="!size-2.5 !border-2 !border-white !bg-[#0d91d7]"
        />
      ) : null}
    </div>
  )
}
