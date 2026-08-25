import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AirflowDagLink } from './AirflowDagLink'

describe('AirflowDagLink', () => {
  it('renders the canonical DAG id with the provider-specific safe external URL', () => {
    render(
      <AirflowDagLink
        runId="run-123"
        providerUrl="https://airflow.example.test:8080/dags/"
      />,
    )

    const link = screen.getByRole('link', { name: /dag_run-123/ })
    expect(link).toHaveTextContent('dag_run-123')
    expect(link).toHaveAttribute('href', 'https://airflow.example.test:8080/dags/dag_run-123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not duplicate an existing DAG prefix', () => {
    render(<AirflowDagLink runId="dag_run-123" providerUrl="https://airflow.example.test:8080" />)

    expect(screen.getByRole('link', { name: /dag_run-123/ })).toHaveAttribute(
      'href',
      'https://airflow.example.test:8080/dags/dag_run-123',
    )
  })

  it('optionally stops click propagation for interactive table rows', () => {
    const parentClick = vi.fn()
    const { rerender } = render(
      <div onClick={parentClick}>
        <AirflowDagLink runId="run-123" stopPropagation />
      </div>,
    )

    fireEvent.click(screen.getByRole('link'))
    expect(parentClick).not.toHaveBeenCalled()

    rerender(
      <div onClick={parentClick}>
        <AirflowDagLink runId="run-123" />
      </div>,
    )
    fireEvent.click(screen.getByRole('link'))
    expect(parentClick).toHaveBeenCalledOnce()
  })
})
