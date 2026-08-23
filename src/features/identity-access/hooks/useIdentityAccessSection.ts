import { useSearchParams } from 'react-router'
import { parseIdentityAccessSection, type IdentityAccessSectionId } from '../models/identityAccessSections'

const SECTION_PARAM = 'section'

export function useIdentityAccessSection() {
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionId = parseIdentityAccessSection(searchParams.get(SECTION_PARAM))

  const setSectionId = (nextSectionId: IdentityAccessSectionId) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set(SECTION_PARAM, nextSectionId)
    setSearchParams(nextParams)
  }

  return { sectionId, setSectionId }
}
