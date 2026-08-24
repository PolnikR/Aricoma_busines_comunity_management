import { useSearchParams } from 'react-router'
import {
  getIdentityAccessDefaultSectionForGroup,
  getIdentityAccessGroupForSection,
  parseIdentityAccessEntity,
  parseIdentityAccessSection,
  parseIdentityAccessTab,
  sectionSupportsEntity,
  type IdentityAccessSectionGroupId,
  type IdentityAccessSectionId,
  type IdentityAccessTabId,
} from '../models/identityAccessSections'

const SECTION_PARAM = 'section'
const ENTITY_PARAM = 'entity'
const TAB_PARAM = 'tab'

export function useIdentityAccessSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = parseIdentityAccessSection(searchParams.get(SECTION_PARAM))
  const groupId = getIdentityAccessGroupForSection(sectionId).id
  const entityId = parseIdentityAccessEntity(sectionId, searchParams.get(ENTITY_PARAM))
  const tabId = parseIdentityAccessTab(sectionId, entityId, searchParams.get(TAB_PARAM))

  const updateParams = (update: (nextParams: URLSearchParams) => void) => {
    const nextParams = new URLSearchParams(searchParams)
    update(nextParams)
    setSearchParams(nextParams)
  }

  const setSectionId = (nextSectionId: IdentityAccessSectionId) => {
    updateParams(nextParams => {
      nextParams.set(SECTION_PARAM, nextSectionId)
      nextParams.delete(ENTITY_PARAM)
      nextParams.delete(TAB_PARAM)
    })
  }

  const setGroupId = (nextGroupId: IdentityAccessSectionGroupId) => {
    setSectionId(getIdentityAccessDefaultSectionForGroup(nextGroupId))
  }

  const setSectionTab = (nextSectionId: IdentityAccessSectionId, nextTabId: IdentityAccessTabId) => {
    updateParams(nextParams => {
      nextParams.set(SECTION_PARAM, nextSectionId)
      nextParams.delete(ENTITY_PARAM)
      const validatedTab = parseIdentityAccessTab(nextSectionId, null, nextTabId)
      if (validatedTab) nextParams.set(TAB_PARAM, validatedTab)
      else nextParams.delete(TAB_PARAM)
    })
  }

  const setEntityId = (nextEntityId: string | null) => {
    updateParams(nextParams => {
      if (!sectionSupportsEntity(sectionId) || !nextEntityId?.trim()) {
        nextParams.delete(ENTITY_PARAM)
        nextParams.delete(TAB_PARAM)
        return
      }
      nextParams.set(ENTITY_PARAM, nextEntityId.trim())
      nextParams.delete(TAB_PARAM)
    })
  }

  const setTabId = (nextTabId: IdentityAccessTabId) => {
    updateParams(nextParams => {
      const validatedTab = parseIdentityAccessTab(sectionId, entityId, nextTabId)
      if (validatedTab) nextParams.set(TAB_PARAM, validatedTab)
      else nextParams.delete(TAB_PARAM)
    })
  }

  return { sectionId, groupId, entityId, tabId, setSectionId, setSectionTab, setGroupId, setEntityId, setTabId }
}
