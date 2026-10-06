// Display name of a provider object the inventory returns as a free-form record
// (paired volume, mapping): the first non-empty name-like field, else an em dash.
export function providerObjectLabel(value: Record<string, unknown>): string {
  for (const key of ['name', 'volume_name', 'vdisk_name', 'id', 'uid']) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return '—'
}
