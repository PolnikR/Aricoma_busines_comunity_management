import { useSearchParams } from 'react-router'
import {
  getIdentityAccessDefaultSectionForGroup,
  getIdentityAccessGroupForSection,
  parseIdentityAccessSection,
  type IdentityAccessSectionGroupId,
  type IdentityAccessSectionId,
} from '../models/identityAccessSections'

const SECTION_PARAM = 'section'

export function useIdentityAccessSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = parseIdentityAccessSection(searchParams.get(SECTION_PARAM))
  const groupId = getIdentityAccessGroupForSection(sectionId).id

  const setSectionId = (nextSectionId: IdentityAccessSectionId) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set(SECTION_PARAM, nextSectionId)
    setSearchParams(nextParams)
  }

  const setGroupId = (nextGroupId: IdentityAccessSectionGroupId) => {
    setSectionId(getIdentityAccessDefaultSectionForGroup(nextGroupId))
  }

  return { sectionId, groupId, setSectionId, setGroupId }
}
