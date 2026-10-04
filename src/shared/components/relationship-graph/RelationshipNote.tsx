import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

// In a wide row, how many of the trailing grid columns the note fills: 4 right
// after the first node, 2 after the second one.
type NoteSpan = 2 | 4

const spanClass: Record<NoteSpan, string> = {
  2: '@min-[40rem]/relationship-graph:col-span-2',
  4: '@min-[40rem]/relationship-graph:col-span-4',
}

interface RelationshipNoteProps {
  span?: NoteSpan
  children: ReactNode
}

// A neutral end of a row or explanatory state, e.g. "No FlashCopy mappings". It is
// never an error.
export function RelationshipNote({ span, children }: RelationshipNoteProps) {
  return (
    <p className={cn('px-1 text-xs italic text-text-subtle @min-[40rem]/relationship-graph:pl-3', span ? spanClass[span] : undefined)}>
      {children}
    </p>
  )
}
