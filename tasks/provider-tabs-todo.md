# Task Checklist: Shared Scrollable Provider Tabs

## Shared component

- [x] Add opt-in overflow controls to shared `Tabs`.
- [x] Detect overflow and scroll boundaries.
- [x] Reveal the active tab automatically.
- [x] Preserve keyboard tab navigation.
- [x] Add focused shared-component tests.

## VMware inventory

- [x] Render one provider tab per VMware provider.
- [x] Keep selected provider in the `providerId` URL parameter.
- [x] Use the first provider when the URL selection is missing or invalid.
- [x] Place provider tabs above the VM table toolbar.
- [x] Remove the duplicate provider filter field.

## Localization and verification

- [x] Add EN/SK/CZ labels.
- [x] Run focused and discovery-inventory tests.
- [x] Run typecheck and lint.
- [x] Run production build.
- [x] Verify representative browser widths.
