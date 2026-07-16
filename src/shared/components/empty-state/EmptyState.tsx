import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#c9dfef] bg-[#f9fcff] px-6 py-12 text-center" role="status">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#e6f5ff] text-[#0d91d7] shadow-sm">
        <span className="text-sm font-semibold">AB</span>
      </div>
      <h2 className="text-base font-semibold text-[#17233d]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#71819a]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
