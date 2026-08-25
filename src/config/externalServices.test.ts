import { describe, expect, it } from 'vitest'
import { buildAirflowDagUrl, EXTERNAL_SERVICES, normalizeAirflowDagId } from './externalServices'

describe('normalizeAirflowDagId', () => {
  it('adds the canonical DAG prefix to a raw run id', () => {
    expect(normalizeAirflowDagId('run-123')).toBe('dag_run-123')
  })

  it('keeps an already canonical DAG id unchanged', () => {
    expect(normalizeAirflowDagId('dag_run-123')).toBe('dag_run-123')
  })
})

describe('buildAirflowDagUrl', () => {
  it('opens the exact DAG under the selected provider URL', () => {
    expect(buildAirflowDagUrl(
      '260812103627_4c06f9c8',
      'https://airflow.example.test:8080',
    )).toBe('https://airflow.example.test:8080/dags/dag_260812103627_4c06f9c8')
  })

  it.each([
    'https://airflow.example.test:8080/',
    'https://airflow.example.test:8080/dags',
    'https://airflow.example.test:8080/dags/',
  ])('normalizes the provider URL %s', (providerUrl) => {
    expect(buildAirflowDagUrl('run-123', providerUrl))
      .toBe('https://airflow.example.test:8080/dags/dag_run-123')
  })

  it('does not duplicate an existing DAG prefix', () => {
    expect(buildAirflowDagUrl('dag_run-123', 'https://airflow.example.test:8080/dags'))
      .toBe('https://airflow.example.test:8080/dags/dag_run-123')
  })

  it('uses the centrally configured fallback when the provider has no URL', () => {
    expect(buildAirflowDagUrl('run-123', null))
      .toBe(`${EXTERNAL_SERVICES.airflow.dagsUrl}/dag_run-123`)
  })
})
