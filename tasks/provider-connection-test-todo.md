# Checklist: Test pripojenia infraštruktúrneho providera

## Scope guard

- [ ] Testovať iba uložený selected provider.
- [ ] Tlačidlo umiestniť vpravo dole v hlavičke draweru, vedľa type badge riadka.
- [ ] Delete a Edit ponechať v pätičke.
- [ ] Neposielať credential secret z browsera.
- [ ] Nepoužiť falošné časovače ani simulovaný success.
- [ ] Nemeniť discovery, provider create/edit ani delete API kontrakty.

## Predpoklad

- [ ] Backend potvrdil endpoint URL.
- [ ] Backend potvrdil HTTP metódu a umiestnenie `provider_id`.
- [ ] Backend potvrdil success/failure response a metadata polia.
- [ ] Je potvrdené, že v1 používa jednu finálnu odpoveď bez SSE/pollingu.

## Fáza 1: API kontrakt

- [ ] Úloha 1 — failing request/schema testy.
  - [ ] Success payload.
  - [ ] Connection failure.
  - [ ] Invalid/missing metadata.
  - [ ] Provider ID encoding.
  - [ ] Žiadny credential secret v requeste/fixtures.
- [ ] Úloha 2 — endpoint config, Zod schema a API adapter.
  - [ ] `apiFetch` a locked `X-User`.
  - [ ] Stabilný camelCase UI model.
  - [ ] Kontrolovaná chyba bez raw payloadu.
- [ ] Úloha 2A — TanStack mutation hook.
  - [ ] Idle, pending, success a error stav.
  - [ ] Retry pre ten istý explicitný provider ID.
  - [ ] Blokovanie paralelného requestu počas pending stavu.
  - [ ] Bez provider-list cache invalidácie.

## Checkpoint: API

- [ ] Focused API/schema/hook testy.
- [ ] `npm run typecheck`.
- [ ] Request nesie iba identitu providera.

## Fáza 2: Dialóg a accessibility

- [ ] Úloha 3 — presentational `ProviderConnectionTestDialog` test-first.
  - [ ] Preflight kroky.
  - [ ] Pending request stav.
  - [ ] Success metadata: name, hostname, version, IP.
  - [ ] Failure/skipped stavy a Retry.
  - [ ] Accessible status texty a bezpečné chyby.
- [ ] Úloha 4 — shared Modal focus lifecycle test-first.
  - [ ] Initial focus.
  - [ ] Tab/Shift+Tab trap.
  - [ ] Escape close.
  - [ ] Restore/fallback focus.
  - [ ] Existujúce modal testy ostanú zelené.

## Checkpoint: UI komponenty

- [ ] Dialóg funguje bez API pomocou props/fixtures.
- [ ] Nie sú aktívne dva `aria-modal` dialógy.
- [ ] Stav nie je komunikovaný iba farbou.

## Fáza 3: Provider drawer integrácia

- [ ] Úloha 5 — header action a selected-provider flow.
  - [ ] Type badge vľavo.
  - [ ] `Test connection` vpravo dole v hlavičke.
  - [ ] Správny selected provider ID.
  - [ ] Disabled dôvod pri chýbajúcom credentiale.
  - [ ] Drawer sa počas modalu skryje/inertuje a po close sa obnoví.
  - [ ] Edit/Delete zostávajú funkčné.
- [ ] Úloha 6 — EN/SK/CS preklady.
  - [ ] Rovnaké locale kľúče.
  - [ ] Kroky, statusy, metadata, Retry/Close a disabled dôvod.

## Checkpoint: Integrácia

- [ ] `ProvidersCatalogueTable` focused testy.
- [ ] Shared drawer/modal focused testy.
- [ ] Locale parity a JSON parse.
- [ ] Žiadny nový actions stĺpec ani globálne Test tlačidlo v page headeri.

## Fáza 4: Produkčné overenie

- [ ] Browser success flow.
- [ ] Browser failure + Retry flow.
- [ ] Browser request obsahuje správny `provider_id` bez credential secretu.
- [ ] Browser 320 px bez overflow.
- [ ] Browser 768 px so správnym header riadkom.
- [ ] Browser 1440 px podľa schváleného template.
- [ ] Keyboard focus a Escape flow.
- [ ] Čistá browser konzola.
- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] Focused provider testy.
- [ ] `npm test`.
- [ ] Vite production build.
- [ ] Finálny diff neobsahuje nesúvisiace zmeny.

## Hotovo, keď

- [ ] Tlačidlo je na schválenom mieste.
- [ ] Zobrazené kroky a metadata pochádzajú z pravdivého stavu/API odpovede.
- [ ] Chyby neodhaľujú backend ani credential internals.
- [ ] UI, API, accessibility a regresné kontroly prešli.
