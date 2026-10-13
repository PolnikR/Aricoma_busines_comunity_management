# TODO: AIRFLOW Platform Provider connection test

Postup a rozhodnutia: `tasks/platform-provider-airflow-connection-test-plan.md`. Zatiaľ iba plán; implementácia nezačala.

## T1 — Zdieľané tlačidlo (bez závislostí)

- [ ] Vytvoriť tenký `ConnectionTestButton` s pôvodnou ikonou, štýlom, prekladom a disabled hintom.
- [ ] Nahradiť inline tlačidlo v infra Providers; zachovať jeho query správanie.
- [ ] Rozšíriť focused test infra tlačidla a spustiť focused Vitest/ESLint.

## T2 — `skipped` v shared checkliste (bez závislostí)

- [ ] Pridať neutrálny vizuálny/prístupný skipped stav a oddelený skipped počet bez zvýšenia úspechov.
- [ ] Použiť existujúci lokalizovaný passed counter; doplniť iba potrebné EN/SK/CS skipped preklady.
- [ ] Otestovať tri stavy, počty, loading a infra regresiu; spustiť focused Vitest/ESLint a locale parse.

## Checkpoint po T1–T2

- [ ] Focused testy pre tlačidlo/checklist, locale parse a `git diff --check` prechádzajú; generované súbory sú bez zmeny.

## T3 — Spoločný výsledkový dialóg (po T2)

- [ ] Vyňať spoločné výsledkové správanie z infra dialógu do shared tenkého komponentu nad `ChecklistResultDialog`.
- [ ] Zachovať infra adaptér s typom a rolou; umožniť AIRFLOW badge bez Source/Target.
- [ ] Otestovať loading, úspech, `ok: false`, request chybu, skipped, Retry a JSON so schémou.

## T4 — AIRFLOW integrácia (po T1 a T3)

- [ ] Pridať tlačidlo iba do AIRFLOW detailu; zachovať HelpPopover a disabled dôvod.
- [ ] Zapnúť `useTestPlatformProvider` iba po kliknutí; presný key, reset pri otvorení/Retry a lokálne vypnutie retry/auto refetch.
- [ ] Zachytiť testovaný záznam, skryť DetailView pri teste, blokovať duplicitné spustenie/Close počas pending a vrátiť detail po Close.
- [ ] Otestovať ID, nula requestov pred klikom, čerstvý Retry/reopen, focus/reconnect/remount, izoláciu záznamu a modal lifecycle.
- [ ] Rozšíriť wire test o URL, metódu, auth a validovanú odpoveď.

## Checkpoint po T3–T4

- [ ] Jedna používateľská akcia = jeden backend test; žiadny automatický test.
- [ ] Úspech, `ok: false`, skipped a HTTP/network chyba sa zobrazujú správne; žiadne staré dáta počas loadingu.
- [ ] AIRFLOW modal a pôvodný detail nie sú súčasne aktívne; Close obnoví pôvodný detail.

## T5 — Regresia a finálne overenie (po T4)

- [ ] Spustiť explicitné relevantné Vitest súbory, focused ESLint, `npm run typecheck`, locale JSON parse a `git diff --check`.
- [ ] Overiť bez zmeny infra Providers, SMTP, BACKEND, KEYCLOAK a platform CRUD.
- [ ] Ak je app dostupná, vizuálne skontrolovať desktop/mobil, light/dark, focus/Escape, loading, checklist a Response Body.
- [ ] Skontrolovať iba task súbory v diff a po úspešnej verifikácii vytvoriť atomický commit implementácie.
