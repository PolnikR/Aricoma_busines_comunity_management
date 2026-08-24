import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'

export function isRollbackClean(report: RollbackReport): boolean {
  const sectionOk = (section: { status: string } | undefined) => !section || section.status === 'ok'
  return report.status === 'ok'
    && sectionOk(report.airflow)
    && sectionOk(report.ibm)
    && (report.ibm?.errors?.length ?? 0) === 0
}
