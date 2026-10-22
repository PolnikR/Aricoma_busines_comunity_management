import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { routes } from '@/app/routes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import type { OrchestratorPush, RecoveryApplicationFormState, SubmitDagResponse } from '../model/recoveryApplicationTypes'

export interface ApplicationPushDialog {
  entityName: string
  result: OrchestratorPush | null
  providerUrl: string | undefined
}

export interface SaveCompletionInput {
  submitted: Readonly<Pick<RecoveryApplicationFormState, 'name' | 'pushToOrchestrator' | 'orchestrationProviderId'>>
  response: SubmitDagResponse
}

export interface SaveCompletionOptions {
  platformProviders: readonly Pick<PlatformProviderRecord, 'id' | 'url'>[]
}

export interface ApplicationSaveCompletion {
  isSaving: boolean
  beginSave: () => boolean
  failSave: () => void
  markDirty: (dirty: boolean) => void
  requestBack: () => void
  discardDialog: {
    open: boolean
    cancel: () => void
    confirm: () => void
  }
  pushDialog: ApplicationPushDialog | null
  completeSave: (input: SaveCompletionInput) => void
  dismissPushDialog: () => void
}

export function useRecoveryApplicationSaveCompletion({
  platformProviders,
}: SaveCompletionOptions): ApplicationSaveCompletion {
  const navigate = useNavigate()
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pushDialog, setPushDialog] = useState<ApplicationPushDialog | null>(null)
  const navigationGuard = useUnsavedChangesGuard(isDirty || isSaving)
  const guardRef = useRef(navigationGuard)
  const savingRef = useRef(false)
  const completedRef = useRef(false)
  const navigatedRef = useRef(false)

  // Mutation callbacks retain the submitting render, but router blockers may change while awaiting HTTP.
  useLayoutEffect(() => { guardRef.current = navigationGuard }, [navigationGuard])

  const navigateToApplications = () => {
    if (navigatedRef.current) return
    navigatedRef.current = true
    void navigate(routes.recoveryApplications)
  }

  const beginSave = () => {
    if (savingRef.current || completedRef.current || navigatedRef.current) return false
    savingRef.current = true
    setIsSaving(true)
    guardRef.current.cancelNavigation()
    return true
  }

  const failSave = () => {
    if (!savingRef.current || completedRef.current) return
    savingRef.current = false
    setIsSaving(false)
    guardRef.current.cancelNavigation()
  }

  const completeSave = ({ submitted, response }: SaveCompletionInput) => {
    if (completedRef.current) return
    completedRef.current = true
    savingRef.current = false
    setIsSaving(false)
    guardRef.current.cancelNavigation()
    setIsDirty(false)
    if (submitted.pushToOrchestrator && 'orchestrator_push' in response) {
      setPushDialog({
        entityName: submitted.name,
        result: response.orchestrator_push,
        providerUrl: platformProviders.find(provider => provider.id === submitted.orchestrationProviderId)?.url ?? undefined,
      })
      return
    }
    guardRef.current.runWithoutBlocking(navigateToApplications)
  }

  const dismissPushDialog = () => {
    if (savingRef.current || !completedRef.current) return
    setPushDialog(null)
    guardRef.current.runWithoutBlocking(navigateToApplications)
  }

  return {
    isSaving,
    beginSave,
    failSave,
    markDirty: setIsDirty,
    requestBack: () => {
      if (!savingRef.current && !completedRef.current) guardRef.current.requestNavigation(navigateToApplications)
    },
    discardDialog: {
      open: !isSaving && pushDialog === null && navigationGuard.isNavigationBlocked,
      cancel: () => { guardRef.current.cancelNavigation() },
      confirm: () => {
        if (!savingRef.current && !completedRef.current) guardRef.current.confirmNavigation()
      },
    },
    pushDialog,
    completeSave,
    dismissPushDialog,
  }
}
