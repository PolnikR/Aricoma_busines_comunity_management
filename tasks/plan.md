# Implementačný plán: VMware Live Refresh a provider invalidácia

Dátum: 2026-10-22. Stav: spresnený plán schválený používateľovým pokynom vykonať inline; T1–T4 a oba checkpointy dokončené; dôkazy v todo.md.
Úlohy: [todo.md](todo.md). Používateľ výslovne povolil nahradiť dokončený plán Manual WWPN Entry v týchto dvoch súboroch. Policy Catalog dokumenty sa nemenia.

## Cieľ a rozsah

Zabrániť zápisu oneskorenej VMware Live Refresh mutation po úspešnej zmene alebo odstránení providera či relevantných credentials. Zachovať existujúce query keys, Orval fetchers/hooks, `force_refresh: true`, jednu TanStack Query cache, aktuálnu invalidáciu a latest-request-wins. Implementácia dokončená podľa checklistu; finálne dôkazy a limity sú v todo.md. Bez commitu, pushu, stashu, zmeny vetvy alebo worktree podľa zadania.

## Overený východiskový stav

- Vetva `spike/ant-design-shell`, HEAD `f3a00eb2`. Pred plánovaním jediná zistená worktree zmena: 42 pridaných riadkov v `src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`; ide o dodaný regresný test, ktorý treba zachovať vrátane finálnej assertion.
- CodeGraph použitý pred čítaním kódu. Preverené hook, inventory query definície, spoločná invalidácia a jej testy, app QueryClient, cache policy, generated provider/credential mutation options, Resources/Recovery Groups použitie a ADR 0002.
- `useVmwareResourceInventory.ts:125–155`: mutation nemá query cancellation životný cyklus. Snapshot obsahuje search/key/hash/requestId, úspech kontroluje iba lokálny latest request a vykoná `setQueryData`.
- `providerMutationInvalidation.ts:19–26`: cancel → pri delete remove → invalidate. Provider save zachová existujúcu query, preto kontrola samotnej existencie query nestačí.
- `createAppQueryClient.ts:8–10`: spoločný `MutationCache.onSuccess` volá `invalidateProviderMutation`. Nainštalovaný `node_modules/@tanstack/query-core/src/mutation.ts:238–246` najprv awaituje globálny callback, až potom generated mutation callback; provider list invalidácia z generated options teda nasleduje po tomto bode.
- Credential vetva zachytí infra aj platform vzťahy pred prvým await. Za úplný považuje iba čerstvý neprázdny zoznam `role: all` / `type: all`. Chýbajúci, stale, filtrovaný alebo prázdny zoznam zachová konzervatívny fallback na celú príslušnú inventory rodinu. Tieto pravidlá sa nebudú meniť.
- Provider a platform namespaces sú oddelené. Platform provider s rovnakým ID dnes neinvaliduje infra inventory.
- VMware Resources a `useRecoveryGroupResourceInventory` používajú rovnaký VMware hook. Generated non-forced key má tvar `['POST', '/vms/search', params, body]`; live odpoveď sa zapisuje pod tento kľúč. V cache zostáva wire response, UI transformácia prebieha cez select.
- Cache defaults: staleTime 15 minút, gcTime 60 minút, retry 1. ADR 0002 povoľuje facade pre forced refresh; nepridávať vlastné keys ani ručne upravované generated súbory.

## Root cause a reprodukcia

Refresh zachytí query identitu → úspešný delete odstráni cache → oneskorená mutation prejde kontrolou requestId → `setQueryData` query znovu vytvorí. Pri update je obdobným problémom prepísanie inventory dátami získanými so starou konfiguráciou. `cancelQueries` samostatnú mutation nezneplatní.

Skutočne spustené príkazy:

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx -t 'does not restore deleted-provider inventory from a late force-refresh mutation'
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/shared/query/providerMutationInvalidation.test.tsx
```

Prvý beh: 1 failed, 20 skipped; druhý: 37 passed, 1 failed (38 celkom). V hook súbore prešlo pôvodných 20 testov, v invalidácii 17. Jediné zlyhanie je očakávaná finálna assertion na riadku 373: namiesto undefined je v cache `Stale VM`. Test nemeníme kvôli prechodu. Kompletná suite, typecheck, ESLint a build sa počas plánovania nespúšťali.

## Porovnanie riešení

| Možnosť | Posúdenie |
| --- | --- |
| Len cancelQueries alebo kontrola existencie query | Nedostatočné pre samostatnú mutation a update existujúcej query. |
| Query timestamp / isInvalidated | Nie je stabilná identita lifecycle; refetch môže invalidáciu vyčistiť a recreate vytvoriť query s rovnakým key. |
| Vlastné rušenie mutations / event subscription | Vyžaduje koordináciu všetkých volajúcich, credential fallback a samostatné rozlíšenie validity; väčší zásah. |
| Revision guard podľa QueryClient a provider ID | Vybrané: malý spoločný stav platnosti výsledkov, bez inventory dát a bez zmeny kontraktov. |

## Navrhnutý mechanizmus

1. Jeden malý helper v `src/shared/query/providerInventoryRevision.ts`: WeakMap viazaná na QueryClient, per-provider monotónna revision a infra epoch pre široký credential fallback. **Kontrakt tokenu:** pre dané neprázdne `providerId` zachytiť hodnotový snapshot `Readonly<{ providerRevision: number; infraEpoch: number }>`; validácia pred zápisom musí porovnať **obe** hodnoty s aktuálnymi hodnotami v tom istom QueryClient. Rozdiel v ktorejkoľvek z nich znamená neplatný výsledok. Pri konkrétnom provider/complete-credential bump sa mení iba jeho revision; infra epoch sa mení pri incomplete-credential fallback. Snapshot musí byť nemenná kópia čísel, nie referencia na mutable objekt. API iba zachytí/porovná platnosť a zneplatní konkrétne ID alebo celú infra oblasť. Nevytvára cache, event bus ani lifecycle framework.
2. Infra provider submit/delete zvýši revision príslušného ID synchronne pred prvým `await cancelQueries`. Úspešný submit zahŕňa update aj create. Platform submit/delete VMware revisions nemení.
3. Credential submit/delete použije už zachytené `infra.ids` a `infra.complete`: pri complete zvýši revisions všetkých dotknutých ID, aj keď ich queries momentálne neexistujú; pri incomplete zvýši infra epoch. Urobiť pred prvým await a pred provider-list refetchom. Platform invalidácia ostáva pôvodná.
4. Hook pri `forceRefresh()` pridá do snapshotu neprázdne normalizované `providerId` a obe hodnoty revision tokenu. Ak `providerId` chýba, **odmietnuť Live Refresh hneď pred spustením requestu** (jasná chyba cez odmietnutý Promise; bez HTTP, cache zápisu a bez novej pending mutation). Bežný `useQuery` už bez providera nefetchuje, preto sa toto správanie zjednotí bez zmeny verejných props hooku či UI. `onSuccess` pred `setQueryData` vyžaduje pôvodnú latest-request kontrolu aj rovnosť `providerRevision` **a** `infraEpoch`; kontrola a zápis sú synchronné, bez await medzi nimi. Pending/error settle správanie existujúcich platných requestov a návratový Promise zachovať.
5. Delete ani recreate revision nevynuluje. Nový refresh zachytí novú hodnotu a funguje; starý ostane neplatný aj po obnovení rovnakého ID. Žiadny trvalý príznak deleted. WeakMap izoluje klientov a uvoľní stav s klientom; per-ID metadata žijú počas jeho životnosti. Nepridávať neoverený cleanup, ktorý by umožnil návrat starej generácie.

Ochrana garantuje odmietnutie výsledku spusteného pred **úspešne oznámenou lokálnou** lifecycle mutation, ktorej `MutationCache.onSuccess` zvýšil revision. Nezavádza blokovanie refreshov počas prebiehajúcej lifecycle mutation ani nové globálne poradie refreshov medzi rôznymi hook inštanciami. Existujúce latest-request-wins zostáva vo svojom dnešnom rozsahu. Revisions však musia byť zdieľané všetkými inštanciami rovnakého klienta. **Providerless `forceRefresh()` je neplatné volanie** a musí odmietnuť Promise bez requestu. Automatické query správanie bez providera a používateľské UI sa nemenia.

## Poradie a závislosti

T1: guard + existujúca delete reprodukcia → T2: provider lifecycle a izolácia → checkpoint A → T3: credential race scenáre → T4: focused regresie a report → checkpoint B.

Úlohy sú sekvenčné: zdieľajú invalidáciu a hook test súbor. Podrobný checklist a priebežný stav sú iba v todo.md. Maximálne päť súborov na jednu implementačnú úlohu. Po schválení plánu znovu skontrolovať stav zdieľaného workspace; nevracať ani nestashovať cudzie zmeny.

## Testovacia stratégia

Použiť reálny createAppQueryClient, generated mutation options a mock fetch s ručne uvoľňovanými Promise; nepredpokladať poradie podľa sleep. Počkať na skutočný štart requestu, úspech lifecycle mutation a dokončenie starej odpovede. Assertovať finálnu wire cache aj zachovanie novších dát; pri update nezostať len pri kontrole chýbajúcej query.

- Delete: zachovať existujúci test bez oslabenia.
- Update A: starý refresh nesmie prepísať novšiu odpoveď normálneho invalidation refetchu.
- Update B počas refresh A: A sa zapíše. Platform provider s rovnakým ID: A sa zapíše.
- Delete → submit rovnakého ID: stará odpoveď nesmie prepísať nový legitímny refresh. API submit má vstupné ID; testuje sa ochrana klienta pri opätovnom použití ID, nie tvrdenie o produkčnej backend garancii.
- Credential update aj delete: dotknutý A sa ignoruje; pri čerstvom úplnom mapovaní sa nedotknutý B zapíše. Pri neúplnom mapovaní fallback zneplatní aj request, ktorého query bola medzičasom odstránená.
- Shared QueryClient: viac hookov vidí rovnakú invalidáciu. Dva QueryClient: mutation v jednom nemení platnosť druhého.
- Failed provider/credential mutation nemení revisions. Normálny refresh a existujúce latest-request-wins/pending/error testy ostanú zelené.
- Providerless `forceRefresh()` odmietne Promise ešte pred mutation/HTTP a nevytvorí providerless inventory cache. Test zaručí aj zachovanie pôvodnej disabled `useQuery` vetvy.
- Unit test tokenu výslovne preukáže, že zmena `providerRevision` **alebo** `infraEpoch` samostatne zneplatní snapshot; rovnaké hodnoty oboch ho zachovajú.
- Overiť timing: revision je zvýšená už pri vstupe do cancellation, nie až po jeho Promise. Úzky test môže pozastaviť cancelQueries a uvoľniť starú HTTP odpoveď počas čakania.

Focused príkazy sú uvedené pri úlohách. T4 navyše spustí explicitne požadovaný `npm run typecheck`, ESLint iba upravených TS/TSX a `git diff --check` pre tracked zmeny. **Novo vytvorené untracked súbory** (helper a jeho test) preveriť samostatnou read-only whitespace/final-newline kontrolou z TODO; `git diff --check` ich nezahŕňa. Kompletnú suite a production build nespúšťať. Pri zlyhaní oddeliť novú chybu od nesúvisiacej existujúcej chyby dôkazom; neslabovať assertions ani kvalitatívne pravidlá.

## Riziká a hranice

| Riziko | Ošetrenie |
| --- | --- |
| Nové race window pred bumpom | Bump synchronne pred prvým await; timing regresia. |
| Query odstránená, ale mutation stále beží | Revisions neodvodzovať iba zo zoznamu existujúcich queries. |
| Neúplné credential mapovanie | Použiť existujúcu complete logiku a široký infra epoch. |
| Rovnaké ID v platform a infra | Infra bump iba pre infra mutations; test oddelenia. |
| Recreate alebo reset revisions | Monotónnosť počas životnosti QueryClient; žiadne deleted tombstones ani reset na 0. |
| Live Refresh bez providera | Fail-fast odmietnutý Promise pred requestom; žiadne providerless cache zápisy ani nové UI správanie. |
| Zmena mimo lokálneho QueryClient | Revision guard nevidí zmeny vykonané iným používateľom, tabom či klientom, pokiaľ ich lokálny klient nezachytí; riešenie nezavádza cross-client synchronizáciu ani polling. |
| Súbežná cudzia práca | Obmedzené diffy, žiadny stash/reset/commit/push. |

## Otvorené body pred implementáciou

- Plán schválený a vykonaný inline; nové potvrdenie sa nevyžaduje.
- Produkčné overenie backend možnosti reuse ID nie je súčasťou mock testov; ak kontrakt reuse zakazuje, dokumentovať to, ale klientsku platnosť snapshotov aj tak otestovať bez zmeny API.
- Konkrétne názvy minimálneho helper API doladiť v T1; **tvar dvojhodnotového tokenu a pravidlo porovnania oboch hodnôt sú záväzné**. Nevystavovať všeobecnú orchestration vrstvu.
- Externé zmeny bez lokálnej úspešnej mutation (iný klient/tab/používateľ) nie sú touto opravou detegované; uviesť túto hranicu vo finálnom reporte.

## Spresnenie po implementačnej reprodukcii

Samotné odmietnutie `setQueryData` nebolo dostatočné pre dodaný test: `onSettled` prekreslí pripojený hook a QueryObserver po removeQueries vytvorí novú query a spustí obyčajný fetch. Test bez oslabenia assertion odhalil Cached VM namiesto undefined. Hook preto v existujúcom force-refresh stave podrží lokálnu `removedRevision`, len keď je dokončený snapshot neplatný a query nemá dáta. Automatické fetchovanie tejto query pozastaví iba počas rovnosti tejto revision; nová provider revision, explicitný refresh alebo platné dáta ho obnovia. Shared helper stále vlastní výlučne platnosť výsledkov, nie lifecycle tombstones. Pending/error settlement zostáva funkčný a recreate/nový refresh sú otestované.
