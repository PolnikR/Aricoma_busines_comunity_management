# TODO: Globálny Connection Test (Infrastructure + AIRFLOW)

Vykonávaj podľa `tasks/platform-provider-airflow-connection-test-plan.md`. Zatiaľ je schválený iba plán; produkčná implementácia nezačala. Každé T číslo a checkpoint zodpovedajú rovnomennej časti plánu.

## Fáza 1 — Shared UI

### T1 — Zdieľané tlačidlo (bez závislostí)

- [ ] Vytvoriť `src/shared/components/button/ConnectionTestButton.tsx` s pôvodným Button/PlugIcon/accent-soft vizuálom a disabled hintom, bez business logiky.
- [ ] Nahradiť inline infra tlačidlo v `ProvidersCatalogueTable.tsx`; doplniť focused test vzhľadu, akcie a prístupného disabled dôvodu v `ProvidersCatalogueTable.test.tsx`.
- [ ] Spustiť focused Vitest/ESLint pre zmenené súbory.

### T2 — Checklist a spoločný výsledkový dialóg (UI možno pripravovať nezávisle od T1)

- [ ] V `ChecklistResultDialog.tsx` pridať voliteľné connection-test props: Close aj pending, Escape funkčné, backdrop vypnutý; zachovať defaulty ostatných spotrebiteľov.
- [ ] Zobraziť `skipped` neutrálne a s oddeleným počtom; `failed`, infra `timeout` a iný neznámy ne-`ok` ponechať ako chybu. Použiť existujúce lokalizované passed/checks texty a potrebné nové EN/SK/CS skipped kľúče.
- [ ] Vytvoriť `ConnectionTestResultDialog.tsx` a test; jediný modal pre infra typ+rolu a AIRFLOW bez roly, loading/Retry/Response Body/`ProviderTestResponse`.
- [ ] Zmeniť `ProviderConnectionTestDialog.tsx` na infra adaptér; aktualizovať jeho pending Close test a regresiu.
- [ ] Spustiť focused testy `ChecklistResultDialog.test.tsx`, `ConnectionTestResultDialog.test.tsx`, `ProviderConnectionTestDialog.test.tsx`, locale parse a ESLint.

### Checkpoint C1

- [ ] T1–T2 testy prechádzajú; EN/SK/CS sú validné, shared defaulty a infra `timeout` bez regresie; generované súbory bez zmeny.

## Fáza 2 — Globálny ConnectionTestManager

### T3 — Run store a QueryClient bridge (po kontrakte; UI T2 nie je predpoklad)

- [ ] Vytvoriť `ConnectionTestManager.ts` a `ConnectionTestManager.test.ts` s identitou `kind:id`, per-login session scope, runId, synchronickou pending mapou a infra `providerRole` uloženou pri spustení testu.
- [ ] `startTest` volá `queryClient.fetchQuery` s generovanými `getTestProviderQueryOptions` / `getTestPlatformProviderQueryOptions` a jedinečným query key; nastaviť `retry: false`, `staleTime: 0` a vypnúť auto refetch/polling.
- [ ] Deduplikovať pending pre rovnakého providera; povoliť paralelné rôzne identity. `openResult` len číta Query cache; Close nemení request; nový beh po dokončení má nový key/GET a odstráni starú notifikáciu/výsledok rovnakého providera.
- [ ] Testovať dvojklik, paralelizmus, >60 s pending, `ok: false`, HTTP/network error, nový beh bez starej notifikácie/výsledku, správnu infra Source/Target rolu po navigácii, naplnený limit a guard proti oneskorenému settle.

### T4 — Globálne napojenie, relácia a bounded cleanup (po T3)

- [ ] Vytvoriť `ConnectionTestContext.tsx` a test so stabilnými akciami a `useSyncExternalStore` selektormi; neprekresľovať `AppShell` ani nesúvisiace stránky pri zmene jedného behu.
- [ ] Napojenie v `src/app/providers.tsx` umiestniť nad router; manager prežije odmontovanie route; auth identitu číta cez `useAuthContext()` (nie hardcoded UserProvider), rozlišuje konkrétne prihlásenie a nemieša ho s token refreshom. V auth-enabled režime blokuje test pri `unknown`/neplatnej identite, dev bypass má vlastný scope; logout/switch vyčistí UI/notifikácie/test query a ignoruje starý settle. Ak treba, cielene rozšíriť auth kontrakt.
- [ ] Obmedziť na päť iba súčasne viditeľné notifikácie, ďalšie nech zostanú vo FIFO a s platným Query výsledkom (`gcTime: Infinity` pre test query, explicitný cleanup pri dismiss/open+close/novom behu tej istej identity/session switch). Žiadna automatická strata nepotvrdených výsledkov; pending a otvorený výsledok ponechať.
- [ ] Rezervovať pred GET max. 20 slotov pre pending/nepotvrdené/otvorené výsledky; pri naplnení nevykonať ďalší request, vysvetliť dôvod, po spracovaní výsledku uvoľniť slot. Nemaž cudzie nevybavené výsledky. Žiadne credentials, druhá cache payloadu, `localStorage` ani polling.
- [ ] Testovať navigáciu, StrictMode, session switch aj `unknown`/dev bypass, staré neskoré Promise, cache cleanup, 6+ notifikácií bez straty, výsledok po prekročení štandardného `gcTime`, plný limit/uvolnenie slotu a selektívne re-rendery.

### Checkpoint C2

- [ ] T3–T4 testy potvrdzujú jeden pending beh na identitu, paralelné iné identity, request cez route zmenu, session izoláciu a bounded cache bez duplikovania payloadu.

## Fáza 3 — Globálny host a notifikácia

### T5 — Jeden výsledkový host a neblokujúca notifikácia (po T2–T4)

- [ ] Vytvoriť `ConnectionTestHost.tsx` a test; v `AppProviders` vykresliť jediný globálny `ConnectionTestResultDialog` pre vybraný run z Query cache.
- [ ] Vytvoriť `ConnectionTestNotification.tsx` a test podľa root `connection-notification-prototype.html`: vpravo hore, light/dark/mobile, success/error, názov, stručný výsledok, dismiss a lokalizované „Zobraziť výsledok“ v EN/SK/CS.
- [ ] Po dokončení pri skrytom modale vytvoriť jednu notifikáciu bez timeoutu; pri otvorenom modale ukázať výsledok priamo bez notifikácie. Zobraziť najviac päť neprekrývajúcich sa kariet; ďalšie čakajú bez straty výsledku a pri novom teste rovnakého providera odstrániť starú neaktuálnu notifikáciu.
- [ ] „Zobraziť výsledok“ otvorí spoločný modal iba z **platnej** Query cache, bez GET aj po dlhom čakaní; výsledok udržať do zavretia modalu. Toast je pod cudzím modal overlay a neblokuje bežné akcie; preveriť focus fallback a `dialogStack`.

### Checkpoint C3

- [ ] Po route zmene host stále vidí dokončenie; toast vzniká iba pre skrytý dialóg; otvorenie výsledku z toastu nevykoná request a nevytvorí druhý aktívny modal.

## Fáza 4 — Migrácia Infrastructure Providers

### T6 — Presun infra testu na manager (po T1–T5)

- [ ] V `ProvidersCatalogueTable.tsx` nahradiť lokálne `useTestProvider`/`resetQueries`/`isConnectionTestOpen` volaniami globálnych akcií a selektívnym stavom; ponechať selection a credential guard; `selected.role` uložiť v globálnom behu, aby Source/Target fungoval aj po opustení Providers.
- [ ] Skryť detail iba počas viditeľného globálneho test modalu; Close/Escape počas pending vrátia detail a focus, backdrop nič, request pokračuje aj po navigácii.
- [ ] Rozšíriť `ProvidersCatalogueTable.test.tsx` (a `ProviderConnectionTestDialog.test.tsx` podľa potreby) o Close→reopen pending bez GET, dokončenie na inej route/notifikáciu, Retry po dokončení, `timeout` a neznámy stav.

### Checkpoint C4

- [ ] Infra test používa len globálny manager; doterajšie success/error/credential/role správanie zostáva a pending prežíva navigáciu.

## Fáza 5 — AIRFLOW Platform Provider

### T7 — AIRFLOW tlačidlo a napojenie (po T6)

- [ ] V `PlatformProvidersTable.tsx` pridať shared tlačidlo len pri AIRFLOW s `credentialStatus === 'ok'` a rovnakým disabled dôvodom; zachovať HelpPopover.
- [ ] Napojenie `startTest('platform', id, name)`, detail skrytý len pri viditeľnom modale danej identity, po Close obnovený detail/focus; badge AIRFLOW bez Source/Target.
- [ ] V `PlatformProvidersTable.test.tsx` doplniť vhodný QueryClientProvider/manager wrapper alebo partial mock generovaného modulu a zachovať CRUD testy; otestovať šesť kontrol, skipped, `ok: false`, chyby, Close/reopen/navigáciu/notifikáciu/Retry a izoláciu záznamu.
- [ ] V `platformProvidersWire.test.tsx` overiť URL, `provider_id`, metódu, auth cestu a validovaný response. SMTP/BACKEND/KEYCLOAK zostávajú bez tlačidla.

### Checkpoint C5

- [ ] Infra a AIRFLOW zdieľajú jedného managera, modal a notifikáciu; výsledky sa pri zmene providera nezmiešajú; ostatné platform typy a CRUD bez regresie.

## Fáza 6 — Regresia a vizuálne overenie

### T8 — Koncové scenáre a verifikácia (po T7)

- [ ] Otestovať pending → Close/Escape → navigácia → dokončenie → notifikácia → Zobraziť výsledok bez GET a so správnou infra Source/Target rolou; pri otvorenom modale bez notifikácie. Podľa potreby pridať `ConnectionTestFlow.test.tsx`.
- [ ] Otestovať duplicate same provider, paralelné rôzne providery, nový run po dokončení, starý settle, session switch/`unknown`/dev bypass, 6+ notifikácií, uchovanie Query payloadu, limit 20/uvoľnenie, explicitný cleanup, StrictMode, focus/`dialogStack`, backdrop bez zavretia a bez auto refetch.
- [ ] Spustiť explicitné relevantné Vitest súbory (manager, context, host, notification, shared/infra dialog, obe tabuľky a wire), focused ESLint zmenených TS/TSX, `npm run typecheck`, parse EN/SK/CS a `git diff --check`. Celý suite/build iba pri konkrétnom dôvode.
- [ ] Ak je aplikácia dostupná, skontrolovať desktop/mobil, light/dark, dlhý request, viac toastov, loading, Response Body, focus a modal stack.
- [ ] Skontrolovať úzky diff, bez BE/OpenAPI/generovaných zmien; po úspešnej verifikácii vytvoriť atomický implementačný commit.

### Checkpoint C6

- [ ] Všetky kritériá z plánu vrátane Source/Target po navigácii, neexpirujúcich nevybavených výsledkov, odstránenia starých notifikácií pri novom behu a bezpečnej relácie sú splnené; zmena je pripravená na review.
