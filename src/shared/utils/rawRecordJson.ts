export function toRawRecordJson<Raw, T extends { rawRecord?: Raw }>(record: T): Raw | T {
  return record.rawRecord ?? record
}
