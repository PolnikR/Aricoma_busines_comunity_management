import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { ModuleWorkQueuePage } from './ModuleWorkQueuePage'

describe('ModuleWorkQueuePage', () => {
  it('renders traceability, API boundary, and workflow cards', () => {
    render(
      <LanguageProvider>
        <ModuleWorkQueuePage
          eyebrow="Module"
          title="Work queue"
          description="Description"
          excelSource="Sheet 1"
          apiBoundary="/api/items"
          workflowItems={['Review', 'Approve']}
        />
      </LanguageProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Work queue' })).toBeInTheDocument()
    expect(screen.getByText('Sheet 1')).toBeInTheDocument()
    expect(screen.getByText('/api/items')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(screen.getByText('Approve')).toBeInTheDocument()
  })
})
