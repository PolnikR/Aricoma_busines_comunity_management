# Provider Dialog Overflow and Platform Layout Design

## Status

Approved by the user on 2026-08-20.

## Goal

Remove the desktop/tablet scrollbar from the infrastructure-provider and
platform-provider dialogs. A long VM tag list must scroll only inside the
multi-select dropdown. Reorganize the platform-provider dialog into the same
wide, compact visual structure as the infrastructure-provider dialog.

## Overflow Behavior

- The shared `Modal` keeps its current scrollable content behavior by default.
- A new opt-in responsive content-overflow mode is added for provider dialogs.
- In that mode, the modal body remains scrollable on small viewports as an
  accessibility fallback and becomes `overflow-visible` from `md` upward.
- Both provider dialogs opt into the responsive mode.
- `MultiSelectDropdown` remains the only desktop/tablet vertical scroll region:
  its option list keeps a bounded height and `overflow-y-auto`.
- The dropdown is not portalled; its current focus and outside-click behavior
  remain unchanged.

## Platform Dialog Layout

The platform modal uses the same `lg` width as the infrastructure-provider
modal. Fields are arranged as follows:

1. ID + provider name
2. Description across the full width
3. Type + credentials
4. IP address + port
5. VM prefix + VM tags
6. URL + DAG directory

Paired rows stack into one column below their responsive breakpoint. Existing
validation, form state, submission, and tag-fetching behavior are unchanged.

## Accessibility and Responsive Rules

- Focus trapping, Escape handling, backdrop behavior, labels, and keyboard
  multi-select behavior remain intact.
- The mobile scroll fallback prevents fields and footer actions from becoming
  unreachable on short or narrow screens.
- The modal scrollbar must not appear at `md`, `lg`, or desktop widths when
  content fits the approved compact layout.

## Verification

- Component tests cover the default and responsive modal overflow classes.
- Multi-select tests confirm the option list owns its bounded scrollbar.
- Platform form tests confirm every approved field pair shares a responsive
  grid row.
- Provider modal tests confirm both dialogs opt into responsive overflow and
  the platform dialog uses `lg` sizing.
- Focused tests, TypeScript validation, focused lint, and `git diff --check`
  must pass.
- Browser verification covers 320, 768, 1024, and 1440 pixel widths when a
  browser runtime is available.

## Out of Scope

- Changing provider data contracts or API calls.
- Fetching VMware tags for platform providers.
- Changing overflow behavior for unrelated dialogs.
