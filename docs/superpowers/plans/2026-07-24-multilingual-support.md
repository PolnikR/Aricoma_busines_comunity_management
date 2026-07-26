# Multilingual Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multilingual support (English, Slovak, Czech) to the app with a language switcher in the header user menu, auto-detect browser language, and persist user's language choice.

**Architecture:** Translation JSON files in `src/locales/` provide all UI strings organized by module with dot-notation keys. A React Context (`LanguageContext`) manages language state and persists to localStorage. A custom `useTranslation` hook provides access to translations. On first app load, language auto-detects from browser, but users override via a dropdown menu in the header that replaces the static user badge.

**Tech Stack:** React 19, TypeScript, React Router, localStorage API, no external i18n library.

## Global Constraints

- Three languages: English (en), Slovak (sk), Czech (cs)
- Language files: `src/locales/{en,sk,cs}.json` with 300+ UI strings in flat key-value structure
- Browser language detection: use `navigator.language` on first app load
- localStorage key: `app-language`, stores language code (en/sk/cs)
- Header dropdown: convert existing user badge to clickable dropdown; add language options + Settings + Logout buttons
- No logout functionality yet — button exists but has no onClick handler
- Auto-detect checks localStorage first, then browser language, defaults to English

---

## File Structure Overview

**New files:**
- `src/locales/en.json` — 300+ English translation keys
- `src/locales/sk.json` — Slovak translations (identical keys)
- `src/locales/cs.json` — Czech translations (identical keys)
- `src/contexts/LanguageContext.tsx` — Language context + provider + browser detection + localStorage persistence
- `src/hooks/useTranslation.ts` — Hook to access translations and current language
- `src/app/header/UserMenu.tsx` — Dropdown menu component with language switcher

**Modified files:**
- `src/main.tsx` — wrap app in LanguageProvider
- `src/app/header/Header.tsx` (or wherever user badge is) — replace badge with UserMenu component

---

### Task 1: Create Translation Files

**Files:**
- Create: `src/locales/en.json`
- Create: `src/locales/sk.json`
- Create: `src/locales/cs.json`

**Interfaces:**
- Produces: Translation object `{ [key: string]: string }` with 300+ keys organized by module (nav.*, pages.*, tables.*, buttons.*, forms.*, etc.)

- [ ] **Step 1: Create English translations file**

Create `src/locales/en.json` with the complete 390-line JSON from the spec (lines 59-390 in spec). This includes all header, navigation, page, table, toolbar, button, form, detail, dialog, drawer, pagination, legend, alert, error, status, density, and common keys.

- [ ] **Step 2: Create Slovak translations file**

Create `src/locales/sk.json` with Slovak translations (390-line JSON from spec lines 396-727). Identical key structure to English, Slovak values only.

- [ ] **Step 3: Create Czech translations file**

Create `src/locales/cs.json` with Czech translations (390-line JSON from spec lines 732-1064). Identical key structure, Czech values only.

- [ ] **Step 4: Verify JSON validity**

Run: `node -e "['en','sk','cs'].forEach(l => console.log(l, ':', Object.keys(require('./src/locales/' + l + '.json')).length, 'keys'))"`

Expected: Three lines showing each language has 300+ keys.

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json src/locales/sk.json src/locales/cs.json
git commit -m "feat: add 300+ translation keys for en, sk, cs"
```

**Acceptance Criteria:**
- [ ] All three translation files exist with valid JSON
- [ ] All three files have identical key structure
- [ ] Key count: 300+ per file
- [ ] Keys follow dot-notation hierarchy (header.*, nav.*, pages.*, etc.)

**Verification:**
- [ ] `npm run lint` — no errors
- [ ] JSON files parse without errors
- [ ] All three files have same key count

**Dependencies:** None

**Estimated scope:** S (3 new files, 1200+ lines of JSON)

---

### Task 2: Create Language Context and Provider

**Files:**
- Create: `src/contexts/LanguageContext.tsx`

**Interfaces:**
- Produces: Exports `LanguageProvider` (component), `useLanguageContext` (hook), `Language` type ('en' | 'sk' | 'cs')
- Context value: `{ language: Language, setLanguage: (lang: Language) => void, translations: Record<string, string> }`

- [ ] **Step 1: Create LanguageContext.tsx with full implementation**

Create `src/contexts/LanguageContext.tsx` with the implementation from spec (lines 1113-1191). Includes:
- `Language` type definition
- `LanguageContextType` interface
- `getBrowserLanguage()` function
- `LanguageProvider` component with:
  - useState hook for language (checks localStorage then browser)
  - useState hook for translations
  - useEffect to dynamically import translation JSON
  - setLanguage function that updates state and localStorage
- `useLanguageContext()` hook with error boundary

- [ ] **Step 2: Verify TypeScript types**

Run: `npm run typecheck`

Expected: No errors in LanguageContext.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/LanguageContext.tsx
git commit -m "feat: create LanguageContext with browser detection and localStorage persistence"
```

**Acceptance Criteria:**
- [ ] Context exports `LanguageProvider` component
- [ ] Context exports `useLanguageContext` hook
- [ ] Browser language detected from `navigator.language`
- [ ] localStorage checked first, then browser language
- [ ] `setLanguage` updates state AND localStorage
- [ ] Translations loaded dynamically per language
- [ ] Default language is English

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 1 (translation files must exist to load)

**Estimated scope:** S (1 file, ~85 lines)

---

### Task 3: Create useTranslation Hook

**Files:**
- Create: `src/hooks/useTranslation.ts`

**Interfaces:**
- Consumes: `useLanguageContext()` from LanguageContext
- Produces: `useTranslation()` hook returning `{ t: (key: string) => string, language: Language }`

- [ ] **Step 1: Create useTranslation.ts**

Create `src/hooks/useTranslation.ts` with the implementation from spec (lines 1242-1253):
```typescript
import { useLanguageContext } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { language, translations } = useLanguageContext()

  const t = (key: string): string => {
    return translations[key] || key
  }

  return { t, language }
}
```

- [ ] **Step 2: Verify types**

Run: `npm run typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTranslation.ts
git commit -m "feat: add useTranslation hook for accessing translations and current language"
```

**Acceptance Criteria:**
- [ ] Hook exports `useTranslation` function
- [ ] Returns object with `t` function and `language`
- [ ] `t(key)` returns translation value or the key itself if not found
- [ ] Hook can be used in any component

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 2 (LanguageContext must exist)

**Estimated scope:** XS (1 file, ~15 lines)

---

### Task 4: Wrap App in LanguageProvider

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `LanguageProvider` from LanguageContext
- Produces: App wrapped with LanguageProvider at root level

- [ ] **Step 1: Read src/main.tsx to see structure**

Read the file to identify where App is rendered and what wraps it (StrictMode, etc.).

- [ ] **Step 2: Add LanguageProvider import**

Add at the top of `src/main.tsx`:
```typescript
import { LanguageProvider } from '@/contexts/LanguageContext'
```

- [ ] **Step 3: Wrap App with LanguageProvider**

Modify the ReactDOM.createRoot render call to wrap App inside LanguageProvider:
```typescript
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
)
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "feat: wrap app in LanguageProvider for global language context"
```

**Acceptance Criteria:**
- [ ] LanguageProvider wraps the entire app component tree
- [ ] App builds successfully

**Verification:**
- [ ] `npm run build` — succeeds
- [ ] `npm run typecheck` — no errors

**Dependencies:** Task 2 (LanguageProvider must exist)

**Estimated scope:** XS (1 file, 2-line change)

---

### Task 5: Create UserMenu Dropdown Component

**Files:**
- Create: `src/app/header/UserMenu.tsx`

**Interfaces:**
- Consumes: `useTranslation()` from hooks
- Produces: `UserMenu` component accepting optional props (userName, userTitle, userInitials)

- [ ] **Step 1: Create UserMenu.tsx with dropdown structure**

Create `src/app/header/UserMenu.tsx` with implementation from spec (lines 1356-1443). Component includes:
- Props interface: userName, userTitle, userInitials (all optional with defaults)
- State: isOpen boolean
- useRef: dropdownRef for click-outside detection
- useEffect: click-outside handler
- Render: 
  - Button with user avatar, name, title
  - Dropdown menu with:
    - Language selection (3 buttons for en/sk/cs)
    - Settings button
    - Logout button (red text)
  - Conditional rendering based on isOpen
  - Language buttons have conditional styling (blue bg if current language)
  - onClick handlers for language buttons left as placeholders for next task

- [ ] **Step 2: Verify TypeScript**

Run: `npm run typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/header/UserMenu.tsx
git commit -m "feat: create UserMenu dropdown component with language options"
```

**Acceptance Criteria:**
- [ ] Component renders user avatar button with name and title
- [ ] Clicking button toggles dropdown menu
- [ ] Dropdown shows three language buttons with correct labels
- [ ] Dropdown shows Settings and Logout buttons
- [ ] Current language button is highlighted (blue background)
- [ ] Click outside dropdown closes it
- [ ] Language buttons have onClick placeholders (wired in next task)

**Verification:**
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors

**Dependencies:** Task 3 (useTranslation hook must exist)

**Estimated scope:** S (1 file, ~100 lines)

---

### Task 6: Wire Language Buttons and Replace Header Badge

**Files:**
- Modify: `src/app/header/UserMenu.tsx` (wire setLanguage)
- Modify: `src/app/header/Header.tsx` (or location of user badge)

**Interfaces:**
- Consumes: `useLanguageContext()` from LanguageContext
- Modifies: UserMenu language buttons to call `setLanguage('en' | 'sk' | 'cs')`
- Integrates: UserMenu component into Header component

- [ ] **Step 1: Add useLanguageContext import to UserMenu.tsx**

Add import:
```typescript
import { useLanguageContext } from '@/contexts/LanguageContext'
```

- [ ] **Step 2: Update UserMenu to use setLanguage**

In the UserMenu component, add:
```typescript
const { setLanguage } = useLanguageContext()
```

Then update each language button's onClick:
```typescript
<button
  onClick={() => {
    setLanguage('en')
    setIsOpen(false)
  }}
  // ... rest of button
>
  {t('language.en')}
</button>
```

Repeat for 'sk' and 'cs' buttons.

- [ ] **Step 3: Locate Header component**

Read `src/app/header/Header.tsx` (or wherever the user badge currently exists) to find the current badge rendering.

- [ ] **Step 4: Import UserMenu in Header**

Add:
```typescript
import { UserMenu } from './UserMenu'
```

- [ ] **Step 5: Replace badge with UserMenu**

Find the existing user badge element and replace it with:
```typescript
<UserMenu />
```

If the badge receives props (userName, userTitle, userInitials from state/context), pass them:
```typescript
<UserMenu userName={userName} userTitle={userTitle} userInitials={initials} />
```

- [ ] **Step 6: Verify app builds**

Run: `npm run build`

Expected: Build succeeds, no errors.

- [ ] **Step 7: Commit both files**

```bash
git add src/app/header/UserMenu.tsx src/app/header/Header.tsx
git commit -m "feat: wire language switcher and integrate UserMenu into header"
```

**Acceptance Criteria:**
- [ ] Language buttons in UserMenu call `setLanguage()` when clicked
- [ ] Clicking a language button changes app language immediately
- [ ] All text in app updates to new language after selection
- [ ] Selected language is highlighted in dropdown
- [ ] Old user badge is completely replaced with UserMenu
- [ ] Settings button renders (no action needed yet)
- [ ] Logout button renders (no action needed yet)
- [ ] App builds successfully

**Verification:**
- [ ] `npm run build` — succeeds
- [ ] `npm run typecheck` — no errors
- [ ] `npm run lint` — no errors
- [ ] Manual: Click language buttons, app language changes

**Dependencies:** Task 5 (UserMenu), Task 2 (LanguageContext), Task 4 (LanguageProvider in app)

**Estimated scope:** S (2 files, minimal modifications)

---

## Checkpoint: Multilingual Support Complete

Before considering this feature done, verify:

- [ ] All three translation JSON files created (en.json, sk.json, cs.json)
- [ ] Each file contains 300+ keys with identical structure
- [ ] LanguageContext.tsx created with browser detection and localStorage persistence
- [ ] useTranslation.ts hook created and exports correctly
- [ ] src/main.tsx wraps app in LanguageProvider
- [ ] UserMenu.tsx created with dropdown and language buttons
- [ ] Header.tsx updated to use UserMenu instead of old badge
- [ ] Language buttons call setLanguage() when clicked
- [ ] Changing language updates all UI text immediately
- [ ] Language preference persists across page reloads
- [ ] Browser language auto-detected on first load
- [ ] `npm run lint` — clean, 0 errors
- [ ] `npm run typecheck` — clean, 0 errors
- [ ] `npm run build` — succeeds
- [ ] Manual QA: Switch languages in header dropdown, verify app responds

---

## Future Work (Out of Scope)

- Gradually replace hardcoded strings in components with useTranslation() calls
- Implement Settings page to show language and other preferences
- Implement Logout functionality
- Add language-specific date/number formatting using Intl API
- Support right-to-left languages
- Add language switching persistence to user account (once user auth is built)
