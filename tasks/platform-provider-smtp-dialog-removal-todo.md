# Task Checklist: Odstránenie SMTP tlačidla z Platform Provider drawera

## Task 1: Drawer SMTP providera bez SMTP tlačidla

- [x] Nahradiť 3 testy SMTP tlačidla/dialógu jedným testom „SMTP drawer nemá tlačidlo SMTP“ a overiť, že zlyhá.
- [x] Odstrániť `headerActions`, `isSmtpDialogOpen`, render a import `SmtpProviderDetailsDialog` z `PlatformProvidersTable.tsx`.
- [x] `DetailDrawer` `open={selected !== null}`.
- [x] Focused vitest + eslint pre tabuľku.

## Task 2: Odstrániť `SmtpProviderDetailsDialog` a jeho preklady

- [x] Zmazať `SmtpProviderDetailsDialog.tsx` a `SmtpProviderDetailsDialog.test.tsx`.
- [x] Odstrániť `platformProviders.smtpDialog.*` z `en.json`, `cs.json`, `sk.json`.
- [x] grep `smtpDialog|SmtpProviderDetailsDialog` v `src` je prázdny.
- [x] JSON parse check locale súborov + focused typecheck.

## Checkpoint: Complete

- [x] Focused testy a lint prejdú.
- [x] Stage iba súbory tejto úlohy; locale iba `smtpDialog` riadky (`git add -p`).
- [x] Commit.
