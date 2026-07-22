import { useState } from 'react'
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
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Application Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="e.g., SampleAppRecovery2"
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-blue-light-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="e.g., Recovery of FinanceTBApp2"
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-blue-light-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Environment
        </label>
        <select
          value={environment}
          onChange={e => handleChange('environment', e.target.value)}
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-blue-light-500"
        >
          <option value="dev">dev</option>
          <option value="staging">staging</option>
          <option value="prod">prod</option>
        </select>
      </div>
    </form>
  )
}
