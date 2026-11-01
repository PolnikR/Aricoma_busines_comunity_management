import { DagTemplateVersionSelect as SharedDagTemplateVersionSelect, type DagTemplateVersionSelectProps } from '@/shared/components/dag-template-version-select/DagTemplateVersionSelect'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { recoveryApplicationHelpKey } from '../helpers/recoveryApplicationFieldHelp'

export function DagTemplateVersionSelect(props: Omit<DagTemplateVersionSelectProps, 'id' | 'translationPrefix' | 'help'>) {
  const helpKey = recoveryApplicationHelpKey('template', props.platform)
  return <SharedDagTemplateVersionSelect {...props}
    id="recovery-application-template-version" translationPrefix="recovery.application.lifecycle"
    help={<KeyedHelpPopover key={helpKey} helpKey={helpKey} sections={['effect', 'limitations']} />} />
}
