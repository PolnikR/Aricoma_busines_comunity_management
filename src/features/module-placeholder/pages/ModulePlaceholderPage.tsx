import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'

interface ModulePlaceholderPageProps {
  title: string
  description: string
}

export function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <>
      <PageHeader eyebrow="ABCO Release 1" title={title} description={description} />
      <EmptyState
        title={`${title} is not implemented yet`}
        description="This module is part of the approved ABCO information architecture. Its detailed workflows will be implemented in a later frontend slice."
      />
    </>
  )
}
