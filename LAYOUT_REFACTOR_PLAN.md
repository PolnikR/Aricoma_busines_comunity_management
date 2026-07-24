# Recovery Applications Builder - Layout Refactor Plan

## Problem

Current layout has the metadata form taking up fixed space at the top, causing the tier cards to be cut off at the bottom of the viewport. The page doesn't use the full height available.

## Solution

Refactor to match Virtual Machines page pattern:
- Use `flex` + `flex-1` + `lg:min-h-0` for viewport-filling layout
- Move metadata form into a collapsible card or header section
- Make tier canvas scrollable within the viewport
- Improve mobile responsiveness

---

## Proposed Layout Structure

```
PageHeader (fixed height, no scroll)
│
└── Main Container (flex, flex-1, h-full, overflow hidden)
    │
    ├── Metadata Card (fixed height, top section)
    │   ├── Form inputs: Name, Description, Environment
    │   └── Save button
    │
    └── Builder Card (flex-1, scrollable content)
        │
        └── Grid Layout (responsive)
            ├── VM Sidebar (left, fixed width, scrollable)
            └── Tier Canvas (right, flex-1, scrollable)
```

---

## Changes Required

### 1. RecoveryApplicationBuilderPage.tsx
- Wrap entire content in flex container with `lg:min-h-0`
- Use proper height management classes

### 2. RecoveryAppBuilder.tsx (Main restructure)
- Split into 2 sections:
  - **Metadata Section** (Card, fixed height, border-bottom)
    - Form inputs + Save button
    - Horizontal layout
  - **Builder Section** (Card, flex-1, scrollable)
    - 2-column grid: VM Sidebar + Tier Canvas
    - Both columns scrollable when needed

### 3. Styling Classes
```css
/* Page wrapper */
className="flex min-h-full flex-col lg:h-full lg:min-h-0"

/* Main flex container */
className="flex flex-1 flex-col gap-4 lg:min-h-0"

/* Cards */
className="flex flex-col lg:min-h-0 rounded-lg border bg-white p-4"

/* Builder grid */
className="grid flex-1 gap-4 lg:min-h-0 grid-cols-1 lg:grid-cols-[280px_1fr]"

/* Tier canvas scrollable */
className="overflow-y-auto custom-scrollbar flex-1 lg:min-h-0"
```

---

## Files to Modify

1. **`src/features/providers-connectors/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`**
   - Add outer flex container with proper height management

2. **`src/features/providers-connectors/recovery-applications/components/RecoveryAppBuilder.tsx`**
   - Split layout into metadata card + builder card
   - Add grid layout for sidebar + tiers
   - Apply `lg:min-h-0` and scrolling classes

3. **`src/features/providers-connectors/recovery-applications/components/TierCanvas.tsx`**
   - Remove width constraints
   - Make scrollable: `overflow-y-auto custom-scrollbar`

---

## Visual Comparison

### Current (Broken)
```
┌─────────────────────────────────────┐
│ PAGE HEADER                         │
├─────────────────────────────────────┤
│ FORM (takes up 1/3 of viewport)     │  ← Problem: wastes space
├─────────────────────────────────────┤
│ SIDEBAR | TIER CARDS (1/3)          │  ← Problem: cut off at bottom
│         | TIER CARDS (1/3)          │
│         | ❌ HIDDEN (below fold)    │
└─────────────────────────────────────┘
```

### Proposed (Fixed)
```
┌─────────────────────────────────────┐
│ PAGE HEADER                         │
├─────────────────────────────────────┤
│ METADATA FORM (Card header)         │  ← Compact, horizontal layout
├─────────────────────────────────────┤
│ SIDEBAR  │ TIER CARDS GRID          │  ← Fills remaining viewport
│ (scroll) │ (scrollable as needed)   │
│          │                          │
│ ↓ More   │ ORDER: 1 │ 2 │ 3 │ 4   │
│ VMs ↓    │ [drag]   │   │   │     │
│          │ [drag]   │   │   │     │  ← All visible!
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update RecoveryApplicationBuilderPage.tsx
- Add flex wrapper with `lg:h-full lg:min-h-0`
- Add gap-4 for spacing between sections

### Step 2: Refactor RecoveryAppBuilder.tsx
- Create 2 separate sections:
  - MetadataSection (div with border-b)
  - BuilderSection (Card with flex-1)
- Apply grid layout to builder section
- Pass children properly to each section

### Step 3: Update TierCanvas.tsx
- Remove fixed width (w-full already handles it)
- Add `overflow-y-auto` and `custom-scrollbar`
- Ensure min-h-0 on grid items

### Step 4: Test Responsive Behavior
- Mobile: Stack sidebar above tiers
- Tablet: 2-column with smaller sidebar (250px)
- Desktop: 2-column with current sidebar (280px)

---

## Acceptance Criteria

- ✅ All 4 tier cards visible without scrolling on desktop (1920x1080+)
- ✅ VM sidebar scrollable independently
- ✅ Tier canvas scrollable independently if content exceeds height
- ✅ Form compact and not taking up excessive space
- ✅ Mobile responsive (single column)
- ✅ Matches Virtual Machines page structure
- ✅ No horizontal scroll anywhere
- ✅ Save button always accessible

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|-----------|
| Breaking existing layout | Low | Changes are additive (flex/min-h-0 classes) |
| Component prop changes | Low | No prop interface changes needed |
| Scroll behavior issues | Low | Use same classes as Virtual Machines |

---

## Timeline

- Task 1: Update RecoveryApplicationBuilderPage → 5 min
- Task 2: Refactor RecoveryAppBuilder layout → 10 min
- Task 3: Update TierCanvas styling → 5 min
- Task 4: Test and verify → 5 min
- **Total: ~25 minutes**

---

**Proceed with implementation?**
