# TODO: AIRFLOW Platform Provider connection test

Postup a rozhodnutia: `tasks/platform-provider-airflow-connection-test-plan.md`. Zatiaľ iba plán; implementácia nezačala.

## T1 — Zdieľané tlačidlo (bez závislostí)

- [ ] Vytvoriť tenký `ConnectionTestButton` s pôvodnou ikonou, štýlom, prekladom a disabled hintom.
- [ ] Nahradiť inline tlačidlo v infra Providers; zachovať jeho query správanie.
- [ ] Rozšíriť focused test infra tlačidla a spustiť focused Vitest/ESLint.

## T2 — `skipped` v shared checkliste (bez závislostí)

- [ ] Pridať neutrálny vizuálny/prístupný skipped stav a oddelený skipped počet; infra `timeout` aj neznáme ne-`ok` stavy ponechať ako chyby.
- [ ] Použiť existujúci lokalizovaný passed counter; doplniť iba potrebné EN/SK/CS skipped preklady.
- [ ] Otestovať `ok`, `failed`, `skipped`, infra `timeout`/neznámy stav, počty, loading a infra regresiu; spustiť focused Vitest/ESLint a locale parse.

## Checkpoint po T1–T2

- [ ] Focused testy pre tlačidlo/checklist, locale parse a `git diff --check` prechádzajú; generované súbory sú bez zmeny.

## T3 — Spoločný výsledkový dialóg (po T2)

- [ ] Vyňať spoločné výsledkové správanie z infra dialógu do shared tenkého komponentu nad `ChecklistResultDialog`; v shared dialogu povoliť Close/Escape a štandardný backdrop aj počas pending pre infra Providers aj AIRFLOW.
- [ ] Zachovať infra adaptér s typom a rolou; umožniť AIRFLOW badge bez Source/Target.
- [ ] Otestovať loading, úspech, `ok: false`, request chybu, skipped, Retry a JSON so schémou. Zmeniť starý test očakávajúci disabled Close; testovať Close/Escape/backdrop počas pending bez umožnenia Retry.

## T4 — AIRFLOW integrácia (po T1 a T3)

- [ ] Pridať tlačidlo iba do AIRFLOW detailu; zachovať HelpPopover a disabled dôvod.
- [ ] Spustiť `useTestPlatformProvider` výhradne po kliknutí; presný key, reset len pred novým explicitným behom (nie počas už bežiaceho), lokálne vypnutie retry/auto refetch; nezamieňať viditeľnosť dialógu so stavom testu.
- [ ] Zachytiť testovaný záznam, skryť DetailView iba pri otvorenom dialógu; dovoliť Close/Escape/backdrop počas pending, vrátiť detail a obnoviť focus na namountovaný trigger. Close nesmie cancel/reset/refetch alebo označovať BE test za zrušený.
- [ ] Otestovať ID, nula requestov pred klikom, Retry/nový beh po dokončení, reopen počas pending bez druhého requestu, dokončenie po Close bez samovoľného otvorenia, focus/reconnect/remount, izoláciu záznamu a modal lifecycle.
- [ ] V `PlatformProvidersTable.test.tsx` doplniť izolovaný `QueryClientProvider` a partial mock generovaného modulu (teraz sa mockuje len `useDeletePlatformProvider`); preveriť zachovanie CRUD testov. Rozšíriť wire test o URL, metódu, auth a validovanú odpoveď.
- [ ] V infra `ProvidersCatalogueTable` upraviť Close -> reopen počas pending, aby nevznikol druhý request; overiť návrat focusu a výsledok po Close.

## Checkpoint po T3–T4

- [ ] Jedna nová explicitná akcia = jeden backend test; žiadny automatický ani duplicitný test pri reopen už bežiacej požiadavky.
- [ ] Úspech, `ok: false`, skipped a HTTP/network chyba sa zobrazujú správne; žiadne staré dáta počas loadingu.
- [ ] AIRFLOW modal a pôvodný detail nie sú súčasne aktívne; AIRFLOW aj infra modal sa dá zavrieť počas pending, obnoví sa detail/focus a neskorý výsledok nezmení výber ani neznovuotvorí modal.

## T5 — Regresia a finálne overenie (po T4)

- [ ] Spustiť explicitné relevantné Vitest súbory, focused ESLint, `npm run typecheck`, locale JSON parse a `git diff --check`.
- [ ] Overiť infra Providers vrátane Close/Escape/backdrop počas pending, reopen bez duplicity, focus a regresie statusov `timeout`/neznáme; SMTP, BACKEND, KEYCLOAK a platform CRUD bezo zmeny.
- [ ] Ak je app dostupná, vizuálne skontrolovať desktop/mobil, light/dark, focus/Escape, Close a reopen počas dlhého pending pre oba typy, loading, checklist a Response Body.
- [ ] Skontrolovať iba task súbory v diff a po úspešnej verifikácii vytvoriť atomický commit implementácie.
