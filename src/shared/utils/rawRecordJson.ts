export function toRawRecordJson<Raw, T extends { rawRecord?: Raw | undefined }>(record: T): Raw | T {
  return record.rawRecord ?? record
}
