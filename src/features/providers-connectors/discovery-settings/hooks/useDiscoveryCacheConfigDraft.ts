import { useState } from 'react'
import type { CacheConfigResponseOutput } from '@/generated/query/zod'
import {
  createDiscoveryCacheConfigDraft,
  isDiscoveryCacheConfigDraftDirty,
  toDiscoveryCacheConfigPatch,
  validateDiscoveryCacheConfigDraft,
} from '../helpers/discoveryCacheConfigDraft'

interface DraftState {
  baseline: CacheConfigResponseOutput
  draft: ReturnType<typeof createDiscoveryCacheConfigDraft>
}

export function useDiscoveryCacheConfigDraft(config: CacheConfigResponseOutput | undefined) {
  const [state, setState] = useState<DraftState | undefined>(() => config === undefined ? undefined : { baseline: config, draft: createDiscoveryCacheConfigDraft(config) })
  const [previousConfig, setPreviousConfig] = useState(config)

  if (config !== previousConfig) {
    setPreviousConfig(config)
    setState(current => {
      if (config === undefined) return current
      if (current === undefined) return { baseline: config, draft: createDiscoveryCacheConfigDraft(config) }
      return {
        baseline: config,
        draft: isDiscoveryCacheConfigDraftDirty(current.draft, current.baseline) ? current.draft : createDiscoveryCacheConfigDraft(config),
      }
    })
  }

  const draft = state?.draft
  const isDirty = state !== undefined && isDiscoveryCacheConfigDraftDirty(state.draft, state.baseline)
  const validation = draft === undefined ? undefined : validateDiscoveryCacheConfigDraft(draft)
  const patch = state === undefined || validation?.isValid !== true ? null : toDiscoveryCacheConfigPatch(state.draft, state.baseline)

  function setDefault(key: string, value: string) {
    setState(current => current === undefined ? current : {
      ...current,
      draft: { ...current.draft, defaults: { ...current.draft.defaults, [key]: value } },
    })
  }

  function setRetentionDays(value: string) {
    setState(current => current === undefined ? current : {
      ...current,
      draft: { ...current.draft, historyRetention: { ...current.draft.historyRetention, retentionDays: value } },
    })
  }

  function setMaxRecords(value: string) {
    setState(current => current === undefined ? current : {
      ...current,
      draft: { ...current.draft, historyRetention: { ...current.draft.historyRetention, maxRecords: value } },
    })
  }

  function cancel() {
    setState(current => current === undefined ? current : { ...current, draft: createDiscoveryCacheConfigDraft(current.baseline) })
  }

  function adopt(config: CacheConfigResponseOutput) {
    setState({ baseline: config, draft: createDiscoveryCacheConfigDraft(config) })
  }

  return { draft, isDirty, validation, patch, setDefault, setRetentionDays, setMaxRecords, cancel, adopt }
}
