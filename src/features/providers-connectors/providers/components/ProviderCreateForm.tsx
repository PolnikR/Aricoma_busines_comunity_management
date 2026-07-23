import type { ChangeEvent } from 'react'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { PROVIDER_TYPES } from '@/features/api/providersApi'

export interface ProviderCreateFormData {
  id: string
  name: string
  description: string
  type: string
  ipAddress: string
}

interface ProviderCreateFormProps {
  data: ProviderCreateFormData
  errors: Partial<Record<keyof ProviderCreateFormData, string>>
  isSubmitting: boolean
  // Locks the ID field (edit mode): changing an existing id would create a new
  // provider rather than update the current one.
  idDisabled?: boolean
  onChange: (field: keyof ProviderCreateFormData, value: string) => void
  onSubmit: () => void
}

// Presentational form for creating or editing a provider.
export function ProviderCreateForm({ data, errors, isSubmitting, idDisabled = false, onChange, onSubmit }: ProviderCreateFormProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="space-y-4 px-6 py-4">
      <Field label="ID" htmlFor="create-id">
        <Input
          id="create-id"
          type="text"
          placeholder="e.g., vmware-vcenter-01"
          value={data.id}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting || idDisabled}
          aria-invalid={Boolean(errors.id)}
        />
        {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
      </Field>

      <Field label="Provider name" htmlFor="create-name">
        <Input
          id="create-name"
          type="text"
          placeholder="e.g., Production vCenter"
          value={data.name}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
      </Field>

      <Field label="Description" htmlFor="create-description">
        <Input
          id="create-description"
          type="text"
          placeholder="Brief description of the provider"
          value={data.description}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('description', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
        />
      </Field>

      <Field label="Type" htmlFor="create-type">
        <Select
          id="create-type"
          value={data.type}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('type', event.target.value) }}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.type)}
        >
          <option value="">Select a type</option>
          {PROVIDER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
        {errors.type ? <p className="mt-1 text-xs text-red-600">{errors.type}</p> : null}
      </Field>

      <Field label="IP address" htmlFor="create-ipAddress">
        <Input
          id="create-ipAddress"
          type="text"
          placeholder="e.g., 10.99.99.40"
          value={data.ipAddress}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('ipAddress', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.ipAddress)}
        />
        {errors.ipAddress ? <p className="mt-1 text-xs text-red-600">{errors.ipAddress}</p> : null}
      </Field>
    </div>
  )
}
