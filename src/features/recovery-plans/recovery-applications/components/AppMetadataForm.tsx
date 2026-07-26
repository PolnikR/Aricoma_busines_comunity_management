import { useState } from 'react'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface AppMetadataFormProps {
  onMetadataChange?: (metadata: Partial<RecoveryApplicationFormState>) => void
  initialValues?: { name: string; description: string; environment: 'dev' | 'staging' | 'prod' }
}

export function AppMetadataForm({ onMetadataChange, initialValues }: AppMetadataFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(
    initialValues?.environment ?? 'dev'
  )

  const handleChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setName(value)
        onMetadataChange?.({ name: value })
        break
      case 'description':
        setDescription(value)
        onMetadataChange?.({ description: value })
        break
      case 'environment':
        setEnvironment(value as 'dev' | 'staging' | 'prod')
        onMetadataChange?.({ environment: value as 'dev' | 'staging' | 'prod' })
        break
    }
  }

  return (
    <form className="grid grid-cols-3 gap-4 items-end">
      <Field label="Application Name *" htmlFor="application-name">
        <Input
          id="application-name"
          type="text"
          value={name}
          onChange={e => { handleChange('name', e.target.value); }}
          placeholder="e.g., SampleAppRecovery2"
          required
        />
      </Field>

      <Field label="Description *" htmlFor="application-description">
        <Input
          id="application-description"
          type="text"
          value={description}
          onChange={e => { handleChange('description', e.target.value); }}
          placeholder="e.g., Recovery of FinanceTBApp2"
          required
        />
      </Field>

      <Field label="Environment *" htmlFor="application-environment">
        <Select
          id="application-environment"
          value={environment}
          onChange={e => { handleChange('environment', e.target.value); }}
          required
        >
          <option value="dev">dev</option>
          <option value="staging">staging</option>
          <option value="prod">prod</option>
        </Select>
      </Field>
    </form>
  )
}
