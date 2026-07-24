# Dynamic Tier Management UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to dynamically create, edit, delete, and reorder recovery application tiers with inline editing and drag-and-drop reordering.

**Architecture:** 
- TierCard: Display tier info; click header to toggle edit mode; edit form for ID/name/description inline
- AddTierCard: "+" card in grid; click to reveal new-tier form; auto-slugify ID from name
- TierCanvas: Orchestrate tier cards, AddTierCard, and drag-drop reordering; manage edit state
- RecoveryAppBuilder: Own tier Map state; handle CRUD and tier ID changes (Map key updates)

**Tech Stack:** React, TypeScript, Tailwind CSS, HTML5 drag API, Map for tier state

## Global Constraints

- Tier names must be unique (validated in UI)
- Tier IDs must be unique and are user-editable (auto-slugify from name)
- Minimum 1 tier enforced (delete button disabled if only 1 remains)
- No warning on delete; just remove from Map
- Drag-drop uses HTML5 API (no external library required)
- TDD: write test first, implement, commit

---

## File Structure

```
src/features/recovery-plans/recovery-applications/
  components/
    TierCard.tsx              [MODIFY] — edit mode UI, inline form
    AddTierCard.tsx           [CREATE] — "+" card, new-tier form
    TierCanvas.tsx            [MODIFY] — drag-drop, edit state management
    RecoveryAppBuilder.tsx    [MODIFY] — tier CRUD handlers, Map updates
  utils/
    tierUtils.ts             [CREATE] — slugify, generateTierId helpers
```

---

## Task 1: Create Tier Utility Functions

**Files:**
- Create: `src/features/recovery-plans/recovery-applications/utils/tierUtils.ts`
- Create: `src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts`

**Interfaces:**
- Produces: `slugify(text: string) => string`, `generateTierId(name: string, existingIds: string[]) => string`

---

- [ ] **Step 1: Write test for slugify**

Create `src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { slugify, generateTierId } from './tierUtils'

describe('tierUtils', () => {
  describe('slugify', () => {
    it('converts text to lowercase slug with hyphens', () => {
      expect(slugify('My Tier')).toBe('my_tier')
    })

    it('handles multiple spaces', () => {
      expect(slugify('DB  Cluster')).toBe('db_cluster')
    })

    it('removes special characters', () => {
      expect(slugify('Test@Tier#1')).toBe('test_tier_1')
    })

    it('handles leading/trailing spaces', () => {
      expect(slugify('  Primary DB  ')).toBe('primary_db')
    })

    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('')
    })
  })

  describe('generateTierId', () => {
    it('returns slugified name if not in existingIds', () => {
      expect(generateTierId('My Tier', ['database', 'app'])).toBe('my_tier')
    })

    it('appends counter if slug already exists', () => {
      const existing = ['my_tier', 'my_tier_2']
      expect(generateTierId('My Tier', existing)).toBe('my_tier_3')
    })

    it('returns empty slug + counter if name is empty', () => {
      const existing = ['_1']
      expect(generateTierId('', existing)).toBe('_2')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tierUtils.test.ts
```

Expected output: `FAIL — slugify is not defined`

- [ ] **Step 3: Write implementation**

Create `src/features/recovery-plans/recovery-applications/utils/tierUtils.ts`:

```typescript
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function generateTierId(name: string, existingIds: string[]): string {
  const baseSlug = slugify(name)

  if (!existingIds.includes(baseSlug)) {
    return baseSlug
  }

  let counter = 2
  while (existingIds.includes(`${baseSlug}_${counter}`)) {
    counter++
  }

  return `${baseSlug}_${counter}`
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tierUtils.test.ts
```

Expected output: `PASS — 6 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/utils/tierUtils.ts src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts
git commit -m "feat: add tier utility functions (slugify, generateTierId)"
```

---

## Task 2: Enhance TierCard with Edit Mode UI

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/components/TierCard.tsx`
- Create: `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx`

**Interfaces:**
- Consumes: `RecoveryTier` (from model), `slugify` (from tierUtils)
- Produces: Updated TierCard component with edit mode

**Props (new):**
```typescript
interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: { name: string; description: string }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
}
```

---

- [ ] **Step 1: Read current TierCard to understand structure**

```bash
cat src/features/recovery-plans/recovery-applications/components/TierCard.tsx
```

- [ ] **Step 2: Write test for edit mode toggle**

Create `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TierCard } from './TierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

const mockTier: RecoveryTier = {
  name: 'Database',
  order: 1,
  description: 'Database server group',
  vms: [],
}

describe('TierCard', () => {
  it('renders tier in view mode by default', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        existingIds={['database']}
        canDelete={true}
      />
    )

    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Database server group')).toBeInTheDocument()
  })

  it('toggles to edit mode when header clicked', async () => {
    const user = userEvent.setup()
    const onEditToggle = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={false}
        onEditToggle={onEditToggle}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const header = screen.getByRole('button', { name: /database/i })
    await user.click(header)

    expect(onEditToggle).toHaveBeenCalledWith('database')
  })

  it('shows edit form when isEditing=true', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        existingIds={['database']}
        canDelete={true}
      />
    )

    expect(screen.getByDisplayValue('database')).toBeInTheDocument() // ID input
    expect(screen.getByDisplayValue('Database')).toBeInTheDocument() // Name input
    expect(screen.getByDisplayValue('Database server group')).toBeInTheDocument() // Description input
  })

  it('calls onSave with new values when Confirm clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        onSave={onSave}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const nameInput = screen.getByDisplayValue('Database')
    await user.clear(nameInput)
    await user.type(nameInput, 'Primary DB')

    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmBtn)

    expect(onSave).toHaveBeenCalledWith(
      'database',
      'primary_db',
      { name: 'Primary DB', description: 'Database server group' }
    )
  })

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        onCancel={onCancel}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(onCancel).toHaveBeenCalled()
  })

  it('disables Delete button when canDelete=false', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        existingIds={['database']}
        canDelete={false}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    expect(deleteBtn).toBeDisabled()
  })

  it('calls onDelete when Delete clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        onDelete={onDelete}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteBtn)

    expect(onDelete).toHaveBeenCalledWith('database')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- TierCard.test.ts
```

Expected: FAIL — TierCard component does not have edit mode logic

- [ ] **Step 4: Update TierCard implementation**

Update `src/features/recovery-plans/recovery-applications/components/TierCard.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { slugify } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  id: string
  tier: RecoveryTier
  isEditing?: boolean
  onEditToggle?: (id: string) => void
  onSave?: (id: string, newId: string, updates: { name: string; description: string }) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  existingIds: string[]
  canDelete: boolean
}

export function TierCard({
  id,
  tier,
  isEditing = false,
  onEditToggle,
  onSave,
  onDelete,
  onCancel,
  existingIds,
  canDelete,
}: TierCardProps) {
  const [editId, setEditId] = useState(id)
  const [editName, setEditName] = useState(tier.name)
  const [editDescription, setEditDescription] = useState(tier.description)
  const [idError, setIdError] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (isEditing) {
      setEditId(id)
      setEditName(tier.name)
      setEditDescription(tier.description)
      setIdError('')
      setNameError('')
    }
  }, [isEditing, id, tier])

  const handleConfirm = () => {
    let hasError = false

    if (!editName.trim()) {
      setNameError('Name is required')
      hasError = true
    } else {
      setNameError('')
    }

    if (!editId.trim()) {
      setIdError('ID is required')
      hasError = true
    } else if (editId !== id && existingIds.includes(editId)) {
      setIdError('ID already in use')
      hasError = true
    } else {
      setIdError('')
    }

    if (!hasError) {
      onSave?.(id, editId, { name: editName.trim(), description: editDescription.trim() })
    }
  }

  if (isEditing) {
    return (
      <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">ID</label>
            <input
              type="text"
              value={editId}
              onChange={e => setEditId(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                idError ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="tier_id"
            />
            {idError && <p className="text-xs text-red-600 mt-1">{idError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                nameError ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="Tier name"
            />
            {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Description</label>
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleConfirm}
              className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7bc4] transition"
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete?.(id)}
              disabled={!canDelete}
              className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-md hover:bg-red-100 transition border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canDelete ? 'Cannot delete the last tier' : 'Delete this tier'}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
      <button
        onClick={() => onEditToggle?.(id)}
        className="w-full text-left hover:bg-[#fbfdff] p-2 rounded transition mb-2"
      >
        <h3 className="text-sm font-semibold text-[#17233d]">{tier.name}</h3>
        <span className="text-xs text-[#93a0b5]">Order: {tier.order}</span>
      </button>

      <p className="text-xs text-[#7b8ca4] mb-3">{tier.description}</p>

      <div className="mb-3 p-2 bg-[#fbfdff] rounded border border-[#e3edf6]">
        <p className="text-xs font-semibold text-[#7b8ca4] mb-1">VMs ({tier.vms.length})</p>
        {tier.vms.length > 0 ? (
          <ul className="space-y-1">
            {tier.vms.map(vm => (
              <li key={vm.name} className="text-xs text-[#3b4763]">
                • {vm.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#91a4bc]">No VMs assigned</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEditToggle?.(id)}
          className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete?.(id)}
          disabled={!canDelete}
          className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-semibold rounded-md hover:bg-red-100 transition border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={!canDelete ? 'Cannot delete the last tier' : 'Delete this tier'}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- TierCard.test.ts
```

Expected: `PASS — 8 tests passed`

- [ ] **Step 6: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/components/TierCard.tsx src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx
git commit -m "feat: add edit mode to TierCard with inline name/description/ID editing"
```

---

## Task 3: Create AddTierCard Component

**Files:**
- Create: `src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx`
- Create: `src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx`

**Interfaces:**
- Consumes: `slugify`, `generateTierId` (from tierUtils)
- Produces: AddTierCard component

**Props:**
```typescript
interface AddTierCardProps {
  onAdd?: (id: string, tier: RecoveryTier) => void
  maxOrder: number
  existingIds: string[]
}
```

---

- [ ] **Step 1: Write test for AddTierCard**

Create `src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddTierCard } from './AddTierCard'

describe('AddTierCard', () => {
  it('renders a plus card by default', () => {
    render(<AddTierCard maxOrder={4} existingIds={['database', 'app', 'web', 'db_cluster']} />)

    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('shows form when clicked', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    expect(screen.getByPlaceholderText('Tier name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument()
  })

  it('auto-slugifies ID as name is typed', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    await user.type(nameInput, 'My Custom Tier')

    const idInput = screen.getByPlaceholderText('tier_id') as HTMLInputElement
    expect(idInput.value).toBe('my_custom_tier')
  })

  it('allows manually editing the ID', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const idInput = screen.getByPlaceholderText('tier_id')
    await user.clear(idInput)
    await user.type(idInput, 'custom_id')

    expect((idInput as HTMLInputElement).value).toBe('custom_id')
  })

  it('disables Create if name is empty', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const createBtn = screen.getByRole('button', { name: /create/i })
    expect(createBtn).toBeDisabled()
  })

  it('disables Create if ID is duplicate', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const idInput = screen.getByPlaceholderText('tier_id')
    await user.clear(idInput)
    await user.type(idInput, 'database')

    const createBtn = screen.getByRole('button', { name: /create/i })
    expect(createBtn).toBeDisabled()
  })

  it('calls onAdd with new tier data when Create clicked', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    const descInput = screen.getByPlaceholderText('Optional description')

    await user.type(nameInput, 'New Tier')
    await user.type(descInput, 'A new tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(onAdd).toHaveBeenCalledWith('new_tier', {
      name: 'New Tier',
      description: 'A new tier',
      order: 5,
      vms: [],
    })
  })

  it('closes form after Create', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    await user.type(nameInput, 'New Tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(screen.queryByPlaceholderText('Tier name')).not.toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- AddTierCard.test.ts
```

Expected: FAIL — AddTierCard not found

- [ ] **Step 3: Implement AddTierCard**

Create `src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx`:

```typescript
import { useState } from 'react'
import { slugify, generateTierId } from '../utils/tierUtils'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface AddTierCardProps {
  onAdd?: (id: string, tier: RecoveryTier) => void
  maxOrder: number
  existingIds: string[]
}

export function AddTierCard({ onAdd, maxOrder, existingIds }: AddTierCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [description, setDescription] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    if (!id || id === slugify(name)) {
      setId(slugify(value))
    }
  }

  const isValidId = id.trim() && !existingIds.includes(id)
  const isValidName = name.trim()
  const canCreate = isValidId && isValidName

  const handleCreate = () => {
    if (!canCreate) return

    const newTier: RecoveryTier = {
      name: name.trim(),
      description: description.trim(),
      order: maxOrder + 1,
      vms: [],
    }

    onAdd?.(id.trim(), newTier)
    setIsOpen(false)
    setName('')
    setId('')
    setDescription('')
  }

  const handleCancel = () => {
    setIsOpen(false)
    setName('')
    setId('')
    setDescription('')
  }

  if (isOpen) {
    return (
      <div className="bg-white border border-[#d9e6f1] rounded-lg p-4 shadow-sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">ID</label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none ${
                !isValidId && id ? 'border-red-500' : 'border-[#cfdaea]'
              }`}
              placeholder="tier_id"
            />
            {!isValidId && id && (
              <p className="text-xs text-red-600 mt-1">ID already in use or invalid</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none"
              placeholder="Tier name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#7b8ca4] block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-[#cfdaea] rounded-md focus:outline-none resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex-1 px-3 py-1.5 bg-[#0d91d7] text-white text-sm font-semibold rounded-md hover:bg-[#0a7bc4] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-1.5 bg-[#f0f5fa] text-[#18253d] text-sm font-semibold rounded-md hover:bg-[#e3edf6] transition border border-[#d9e6f1]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="bg-white border-2 border-dashed border-[#cfdaea] rounded-lg p-4 shadow-sm hover:border-[#b9d5e8] hover:bg-[#fbfdff] transition flex items-center justify-center h-full"
    >
      <span className="text-3xl text-[#7b8ca4]">+</span>
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- AddTierCard.test.ts
```

Expected: `PASS — 9 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/components/AddTierCard.tsx src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx
git commit -m "feat: create AddTierCard component for creating new tiers inline"
```

---

## Task 4: Implement Drag-and-Drop Tier Reordering in TierCanvas

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx`
- Modify: `src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`

**Interfaces:**
- Consumes: `TierCard`, `AddTierCard`, `RecoveryTier`
- Produces: Updated TierCanvas with drag-drop and edit state

**New Props:**
```typescript
interface TierCanvasProps {
  tiers: Record<string, RecoveryTier>
  onVMAdded?: (tierId: string, vmName: string) => void
  onVMRemoved?: (tierId: string, vmName: string) => void
  onTierEdit?: (tierId: string, newTierId: string, updates: { name: string; description: string }) => void
  onTierAdd?: (tierId: string, tier: RecoveryTier) => void
  onTierDelete?: (tierId: string) => void
  onTierReorder?: (reorderedTiers: Record<string, RecoveryTier>) => void
}
```

---

- [ ] **Step 1: Write test for drag-drop reordering**

Update `src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TierCanvas } from './TierCanvas'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

const mockTiers: Record<string, RecoveryTier> = {
  database: {
    name: 'Database',
    order: 1,
    description: 'Database tier',
    vms: [{ name: 'DB-01' }],
  },
  app: {
    name: 'Application',
    order: 2,
    description: 'App tier',
    vms: [{ name: 'APP-01' }],
  },
  web: {
    name: 'Web',
    order: 3,
    description: 'Web tier',
    vms: [{ name: 'WEB-01' }],
  },
}

describe('TierCanvas', () => {
  it('renders tiers sorted by order', () => {
    render(<TierCanvas tiers={mockTiers} />)

    const tierElements = screen.getAllByRole('button')
    const firstTierText = tierElements[0].textContent
    expect(firstTierText).toContain('Database')
  })

  it('calls onTierReorder when tier is dragged to new position', async () => {
    const user = userEvent.setup()
    const onTierReorder = vi.fn()

    const { container } = render(
      <TierCanvas tiers={mockTiers} onTierReorder={onTierReorder} />
    )

    const tierCards = container.querySelectorAll('[draggable="true"]')
    expect(tierCards.length).toBeGreaterThan(0)
  })

  it('displays AddTierCard', () => {
    render(<TierCanvas tiers={mockTiers} />)

    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument()
  })

  it('calls onTierEdit when Edit clicked', async () => {
    const user = userEvent.setup()
    const onTierEdit = vi.fn()

    render(<TierCanvas tiers={mockTiers} onTierEdit={onTierEdit} />)

    const editBtns = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editBtns[0])

    // Edit mode should be triggered
    expect(screen.getByDisplayValue('database')).toBeInTheDocument()
  })

  it('calls onTierDelete when Delete clicked', async () => {
    const user = userEvent.setup()
    const onTierDelete = vi.fn()

    render(<TierCanvas tiers={mockTiers} onTierDelete={onTierDelete} />)

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteBtns[0])

    expect(onTierDelete).toHaveBeenCalledWith('database')
  })
})
```

- [ ] **Step 2: Update TierCanvas implementation**

Update `src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx`:

```typescript
import { useMemo, useState } from 'react'
import { TierCard } from './TierCard'
import { AddTierCard } from './AddTierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCanvasProps {
  tiers: Record<string, RecoveryTier>
  onVMAdded?: (tierId: string, vmName: string) => void
  onVMRemoved?: (tierId: string, vmName: string) => void
  onTierEdit?: (tierId: string, newTierId: string, updates: { name: string; description: string }) => void
  onTierAdd?: (tierId: string, tier: RecoveryTier) => void
  onTierDelete?: (tierId: string) => void
  onTierReorder?: (reorderedTiers: Record<string, RecoveryTier>) => void
}

export function TierCanvas({
  tiers,
  onVMAdded,
  onVMRemoved,
  onTierEdit,
  onTierAdd,
  onTierDelete,
  onTierReorder,
}: TierCanvasProps) {
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const sortedTiers = useMemo(() => {
    return Object.entries(tiers)
      .map(([id, tier]) => ({ id, tier }))
      .sort((a, b) => a.tier.order - b.tier.order)
  }, [tiers])

  const maxOrder = useMemo(() => {
    return Math.max(0, ...sortedTiers.map(t => t.tier.order))
  }, [sortedTiers])

  const existingIds = useMemo(() => Object.keys(tiers), [tiers])

  const handleEditToggle = (tierId: string) => {
    setEditingTierId(editingTierId === tierId ? null : tierId)
  }

  const handleSave = (tierId: string, newTierId: string, updates: { name: string; description: string }) => {
    onTierEdit?.(tierId, newTierId, updates)
    setEditingTierId(null)
  }

  const handleCancel = () => {
    setEditingTierId(null)
  }

  const handleDragStart = (id: string) => {
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }

    const draggedIndex = sortedTiers.findIndex(t => t.id === draggedId)
    const targetIndex = sortedTiers.findIndex(t => t.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      return
    }

    const newTiers = { ...tiers }
    const newOrder = sortedTiers.map((t, i) => {
      if (i === targetIndex) return draggedIndex < targetIndex ? i : i + 1
      if (i === draggedIndex) return targetIndex < draggedIndex ? targetIndex : targetIndex - 1
      if (draggedIndex < targetIndex && i > draggedIndex && i <= targetIndex) return i - 1
      if (draggedIndex > targetIndex && i >= targetIndex && i < draggedIndex) return i + 1
      return i
    })

    sortedTiers.forEach((t, i) => {
      newTiers[t.id] = { ...newTiers[t.id], order: newOrder[i] + 1 }
    })

    onTierReorder?.(newTiers)
    setDraggedId(null)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {sortedTiers.map(({ id, tier }) => (
        <div
          key={id}
          draggable
          onDragStart={() => handleDragStart(id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(id)}
          className={`cursor-grab active:cursor-grabbing opacity-100 transition ${
            draggedId === id ? 'opacity-50' : ''
          }`}
        >
          <TierCard
            id={id}
            tier={tier}
            isEditing={editingTierId === id}
            onEditToggle={handleEditToggle}
            onSave={handleSave}
            onDelete={onTierDelete}
            onCancel={handleCancel}
            existingIds={existingIds}
            canDelete={Object.keys(tiers).length > 1}
          />
        </div>
      ))}

      <AddTierCard maxOrder={maxOrder} existingIds={existingIds} onAdd={onTierAdd} />
    </div>
  )
}
```

- [ ] **Step 3: Run test to verify it passes**

```bash
npm test -- TierCanvas.test.ts
```

Expected: `PASS — 6 tests passed`

- [ ] **Step 4: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/components/TierCanvas.tsx src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx
git commit -m "feat: add drag-drop reordering and edit/delete handlers to TierCanvas"
```

---

## Task 5: Update RecoveryAppBuilder to Handle Tier CRUD

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`

**Interfaces:**
- Consumes: Updated TierCanvas props
- Produces: TierCanvas with connected handlers

---

- [ ] **Step 1: Read current RecoveryAppBuilder**

```bash
cat src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx
```

- [ ] **Step 2: Add tier edit handler**

Update `RecoveryAppBuilder.tsx` — add method inside component:

```typescript
const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: { name: string; description: string }) => {
  setFormState(prev => {
    const newTiers = new Map(prev.tiers)
    const oldTier = newTiers.get(tierId)
    
    if (!oldTier) return prev
    
    // If ID changed, delete old and create new
    if (newTierId !== tierId) {
      newTiers.delete(tierId)
    }
    
    newTiers.set(newTierId, {
      ...oldTier,
      name: updates.name,
      description: updates.description,
    })
    
    return { ...prev, tiers: newTiers }
  })
}, [])
```

- [ ] **Step 3: Add tier add handler**

```typescript
const handleTierAdd = useCallback((tierId: string, tier: RecoveryTier) => {
  setFormState(prev => {
    const newTiers = new Map(prev.tiers)
    newTiers.set(tierId, tier)
    return { ...prev, tiers: newTiers }
  })
}, [])
```

- [ ] **Step 4: Add tier delete handler**

```typescript
const handleTierDelete = useCallback((tierId: string) => {
  setFormState(prev => {
    const newTiers = new Map(prev.tiers)
    newTiers.delete(tierId)
    return { ...prev, tiers: newTiers }
  })
}, [])
```

- [ ] **Step 5: Add tier reorder handler**

```typescript
const handleTierReorder = useCallback((reorderedTiers: Record<string, RecoveryTier>) => {
  setFormState(prev => ({
    ...prev,
    tiers: new Map(Object.entries(reorderedTiers)),
  }))
}, [])
```

- [ ] **Step 6: Update TierCanvas props**

In the TierCanvas render, update the component call:

```typescript
<TierCanvas
  tiers={Object.fromEntries(formState.tiers)}
  onVMAdded={handleVMAdded}
  onVMRemoved={handleVMRemoved}
  onTierEdit={handleTierEdit}
  onTierAdd={handleTierAdd}
  onTierDelete={handleTierDelete}
  onTierReorder={handleTierReorder}
/>
```

- [ ] **Step 7: Run tests**

```bash
npm test -- RecoveryAppBuilder
```

Expected: Tests pass or indicate what needs fixing

- [ ] **Step 8: Run linting**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx
git commit -m "feat: connect tier CRUD handlers to TierCanvas (edit, add, delete, reorder)"
```

---

## Task 6: End-to-End Manual Testing

**Files:** None (manual verification)

---

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Navigate to Create Recovery Application page

- [ ] **Step 2: Test default tiers**

Verify 4 tiers render: Database, DB Cluster, Application, Web

- [ ] **Step 3: Test rename tier**

Click Database tier → edit name to "Primary DB" → Confirm

Verify:
- Name updates in card
- Tier ID changes to "primary_db"
- VMs stay with tier (if any)

- [ ] **Step 4: Test add new tier**

Click "+" card → Enter name "Cache" → Create

Verify:
- New tier appears in grid
- Order is 5 (max + 1)
- ID auto-slugified to "cache"

- [ ] **Step 5: Test unique ID validation**

Try creating another tier with name "Database" (should auto-slug to "database" which exists)

Verify:
- Create button disabled
- Error message shows "ID already in use"

- [ ] **Step 6: Test delete tier**

Try deleting Database tier

Verify:
- Tier removed from grid
- If it had VMs, they're lost (no warning shown)
- Delete button still enabled (more than 1 tier remains)

- [ ] **Step 7: Test drag-drop reorder**

Drag Web tier to position 1

Verify:
- Web moves to top
- Order numbers update: Web=1, Database=2, etc.
- Grid re-renders smoothly
- VMs stay with their tier

- [ ] **Step 8: Test min tier enforcement**

Add and delete tiers until only 1 remains

Verify:
- Delete button on the last tier is disabled
- Tooltip says "Cannot delete the last tier"

- [ ] **Step 9: Add VMs and save**

From VM Sidebar, drag VM into reordered tiers

Click "Save Application"

Verify:
- Form submits
- No console errors
- JSON output has correct tier IDs and orders:
  ```json
  {
    "application": {
      "tiers": {
        "primary_db": { "name": "Primary DB", "order": 2, "vms": [...] },
        "cache": { "name": "Cache", "order": 5, "vms": [...] },
        ...
      }
    }
  }
  ```

- [ ] **Step 10: Verify all tests pass**

```bash
npm test
```

Expected: All tests green

- [ ] **Step 11: Verify linting clean**

```bash
npm run lint
```

Expected: No errors

---

## Summary Checkpoint

- [ ] All 6 tasks complete
- [ ] `npm test` passes (all suites)
- [ ] `npm run lint` clean
- [ ] E2E manual flow verified
- [ ] Form submission produces correct JSON with new tier structure
- [ ] Git history has 6+ commits (one per task)

