# Shared Recovery UI and Topology Tooltip Design

## Goal

Complete the remaining shared-component adoption in recovery applications without
changing the current visual design, and remove repeated topology-tooltip
infrastructure while keeping topology-specific content inside the discovery
feature.

## Shared Textarea

Add a shared `Textarea` component next to the existing shared form controls. Its
public API will extend the standard React textarea attributes and support:

- forwarded refs;
- disabled and invalid states;
- consumer `className` composition;
- the same focus, disabled, and error styling conventions as shared `Input`.

`AddTierCard` and the edit mode of `TierCard` will use this component. Their
current dimensions and feature-specific styling will be preserved through
component props and `className`.

## Recovery Page Composition

`RecoveryApplicationBuilderPage` will render its Back action through
`PageHeader.actions` instead of positioning the action independently.

The loading failure state in `RecoveryApplicationEditorPage` will use
`FetchErrorAlert`. This component remains reserved for failed data fetching and
retry-oriented presentation.

## General Alert

Add a shared `Alert` for messages that are not fetch failures. It will support
the variants `info`, `success`, `warning`, and `error`, plus a title, optional
description/content, and consumer `className`.

The alert will use semantic `role="alert"` for error and warning messages and
`role="status"` for informational and success messages. Existing mutation or
validation messages in the touched recovery flow may migrate where doing so
preserves their current behavior. `FetchErrorAlert` will not be replaced.

## Feature-local Topology Tooltip

Add a `TopologyTooltip` primitive within the discovery-inventory infrastructure
feature. It will own:

- portal rendering into `document.body`;
- fixed positioning relative to the associated node;
- viewport-edge collision handling;
- the shared visual wrapper and tooltip ref lifecycle.

The cluster, host, and virtual-machine tooltip components will continue to own
their data contracts and content. Each will provide its estimated dimensions
and children to `TopologyTooltip`.

## Compatibility and Testing

The refactor must preserve current labels, interaction behavior, textarea
values, tier editing, tooltip content, hover timing, and visual class overrides.
Existing tests will be updated only where component structure changes. Shared
components will receive focused tests for their variants and accessibility
behavior.

Verification consists of lint, TypeScript checking, relevant component tests,
the complete test suite, and the production build.

## Out of Scope

- A global tooltip framework for unrelated application features.
- Replacing feature-specific clickable tier surfaces with shared `Button`.
- Changing recovery application data models or API behavior.
- Replacing `FetchErrorAlert` with the general-purpose `Alert`.
