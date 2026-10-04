# Plán: Discovery Settings → Discovery & Inventory (ownership migration)

- Stav: návrh na schválenie, 2026-10-04. Nič nie je implementované.
- Worktree: `Aricoma_busines_comunity_management-test`, vetva `test`, HEAD `a1dc23c0`.
- Úlohy sú v `tasks/discovery-settings-to-discovery-inventory-todo.md`.

**Cieľ:** presunúť ownership feature, nie robiť redesign. Správanie stránky, backend kontrakt, generated API a locale namespace `pages.discoverySettings.*` sa nemenia.

## 1. Overený aktuálny stav

### 1.1 Kde feature žije

`src/features/providers-connectors/discovery-settings/` obsahuje 19 súborov:

| Adresár | Súbory |
|---|---|
| `components/` | `DiscoveryHistoryCard.tsx` (+ test), `DiscoveryNotificationsCard.tsx`, `DiscoveryScheduleCard.tsx`, `DiscoverySettingsLocalCards.test.tsx` |
| `config/` | `discoveryCacheHistoryColumns.tsx` |
| `helpers/` | `discoveryCacheConfigDraft.ts` (+ test) |
| `hooks/` | `useDiscoveryCacheConfigDraft.ts` (+ test), `useDiscoverySettingsSearchParams.ts` (+ test) |
| `mocks/` | `discoverySettingsMocks.ts` |
| `model/` | `discoverySettingsTypes.ts`, `historyParams.ts`, `selectDiscoveryCacheHistory.ts` |
| `pages/` | `DiscoverySettingsPage.tsx`, `DiscoverySettingsPage.test.tsx`, `DiscoverySettingsPage.stubfetch.test.tsx` |

Mimo feature na ňu odkazujú iba tri miesta v `src/app`:
- `AppRoutes.tsx:92` – lazy import stránky;
- `routes.ts:9` – `providerDiscoverySettings`;
- `modulePageConfigs.ts:56-63` – položka v `providersConnectorsPages`.

Žiadny iný feature ani test feature neimportuje.

### 1.2 Route

- `routes.providerDiscoverySettings = '/providers-connectors/discovery-settings'`.
- `AppRoutes.tsx` → `renderProvidersConnectorsRoutes(providersConnectorsPages)` má špeciálnu vetvu pre `routes.providerDiscoverySettings`: `Suspense` + `RouteLoadingSkeleton` + `handle: { contentScroll: 'contained' }`.
- Konfigurácia v `modulePageConfigs` slúži iba ako zoznam ciest, ktoré tento renderer prechádza. Hodnoty `title`, `apiBoundary` a `workflowItems` sa pre Discovery Settings nikde nezobrazujú, lebo sa renderuje skutočná stránka, nie `ModuleWorkQueuePage`.
- `src/app/router.test.tsx` → test „contained desktop scrolling“ **neobsahuje** Discovery Settings. Route má `handle` nastavený, ale nie je otestovaný.

### 1.3 Sidebar

- `src/layouts/app-shell/AppSidebar.tsx`: v skupine `Providers & Connectors` je `{ name: 'Discovery Settings', path: routes.providerDiscoverySettings }`.
- Label: `navKeyMap['Discovery Settings'] = 'nav.providers.discovery'`, v en „Discovery settings“, v cs „Nastavení zjišťování“, v sk „Nastavenia zisťovania“.
- Aktívna skupina sa určuje cez `findRouteMenu` (zhoda cesty alebo jej prefixu). Breadcrumby ani hlavička od domény nezávisia.
- `AppSidebar.test.tsx` Discovery Settings netestuje.

### 1.4 Discovery Jobs

- `routes.discoveryJobs = '/discovery-inventory/discovery-jobs'`, v sidebari pod Discovery & Inventory (`nav.discovery.jobs`).
- Je to placeholder: `discoveryInventoryPlaceholderPages` → `renderModulePageRoutes` → `ModuleWorkQueuePage`. Skutočná implementácia v repe neexistuje.
- V tejto úlohe sa nemení.

### 1.5 Provider-domain závislosti Discovery Settings

| Import | Kde | Charakter |
|---|---|---|
| `useGetProviders` (`@/generated/query/providers/providers.gen`) | `DiscoveryHistoryCard` | generated API, ostáva |
| `selectProviders` (`@/features/providers-connectors/providers/model/selectProviders`, alias) | `DiscoveryHistoryCard` | provider doména, legitímne |
| `providerTypeLabel` (`../../providers/helpers/providerTypeLabel`, **relatívne**) | `DiscoveryHistoryCard`, `discoveryCacheHistoryColumns`, `DiscoverySettingsPage` | provider doména (label typu providera) |
| `ProviderRecord`/provider typy (`../../providers/model/providerTypes`, **relatívne**) | 1 súbor | provider doména |

Generated API: `@/generated/query/discovery-cache/discovery-cache.gen`, `@/generated/query/zod`, `@/shared/api/*`. Ostávajú bez zmeny.

**Neočakávané zistenie:** štyri importy idú relatívne cez `../../providers/...`. Po presune by viedli do neexistujúceho `discovery-inventory/providers/...`, takže sa musia zmeniť na alias `@/features/providers-connectors/providers/...`.

Nejde o generický helper, ktorý by patril do shared vrstvy. `providerTypeLabel` aj `selectProviders` sú provider-doménové. `discovery-inventory` už dnes importuje z `providers-connectors/providers` v 33 súboroch, takže smer `discovery-inventory → providers-connectors/providers` je v repe zavedený. Shared refactor nie je potrebný.

### 1.6 Backend vs local-only

- **Backend:**
  - Configuration: `useGetDiscoveryCacheConfig` (enabled iba na tabe configuration) a `usePutDiscoveryCacheConfig`, s draftom, validáciou, save/cancel a chybou mutácie.
  - History: `useGetDiscoveryCacheHistory` + `useGetProviders` (filter providera, `providerId`, refresh, cached/error, stránkovanie, empty).
- **Local-only:** Notifications (`useState`, `DEFAULT_DISCOVERY_NOTIFICATION_SETTINGS`, status `notifications.status.localOnly`, karta „local only“).
- **Nerenderované stránkou:** `DiscoveryScheduleCard` (+ `DEFAULT_DISCOVERY_SCHEDULE_SETTINGS`, `DISCOVERY_TIMEZONES` v mocks/model). Používa ho iba `DiscoverySettingsLocalCards.test.tsx`. Presúva sa ako súčasť feature bez zmeny funkcie.

### 1.7 Search params

`useDiscoverySettingsSearchParams()` pracuje s `tab` (`configuration` | `history` | `notifications`, default `configuration`, ktorý sa z URL vymaže) a `providerId` (trim, prázdne sa vymaže). Nezávisí od cesty, takže presun route ho nemení.

**Neočakávané riziko:** existujúce legacy redirecty v `AppRoutes.tsx` (`<Navigate to={routes.resources} replace />` atď.) **zahadzujú query string**. Redirect `?tab=history&providerId=vmware-01` cez rovnaký vzor by stratil tab aj filter. V repe nie je komponent, ktorý by `search` zachoval, preto ho treba pridať (T2).

## 2. Rozhodnutia

1. **Cieľový adresár:** `src/features/discovery-inventory/discovery-settings/` s rovnakou vnútornou štruktúrou. Presun cez `git mv` celého adresára, aby história ostala sledovateľná (`git log --follow`).
2. **Canonical route:** `routes.discoverySettings = '/discovery-inventory/discovery-settings'`. Konštanta `providerDiscoverySettings` zaniká.
3. **Legacy route:** zachová sa redirect-only konštanta `routes.discoverySettingsLegacy = '/providers-connectors/discovery-settings'`. Názov sleduje existujúcu konvenciu `resourcesRoleSourceLegacy` / `resourcesRoleTargetLegacy`. Route renderuje iba redirect na `routes.discoverySettings` so **zachovaným `search` a `hash`**. Stránku už nevlastní.
4. **Redirect komponent:** malý `RedirectPreservingSearch` (`to: string`) v `src/app/AppRoutes.tsx`, vedľa `toRoutePath`. Číta `useLocation()` a renderuje `<Navigate to={{ pathname: to, search, hash }} replace />`. Iba jeden konzument, preto bez samostatného súboru a bez shared abstrakcie. Existujúce legacy redirecty sa nemenia (mimo scope).
5. **Routovanie stránky:** priamo v bloku Discovery Inventory v `AppRoutes.tsx`, rovnakým vzorom ako `discovery-inventory/infrastructure` (`Route` + `Suspense` + `RouteLoadingSkeleton` + `handle: { contentScroll: 'contained' }`). **Nie** cez `discoveryInventoryPlaceholderPages`, lebo nejde o placeholder.
6. **`modulePageConfigs`:** položka Discovery Settings sa z `providersConnectorsPages` odstráni a do Discovery Inventory sa nepridáva. Reálne stránky (Resources, Infrastructure, Audit…) tam tiež nie sú. `discoveryInventoryPlaceholderPages` (Discovery Jobs) ostáva nezmenený. Vetva v `renderProvidersConnectorsRoutes` pre Discovery Settings zanikne.
7. **Sidebar:** Discovery & Inventory = Resources, Resources ISE, Infrastructure Topology, Discovery Jobs, **Discovery Settings**. Settings ide na koniec, za Jobs, podľa vzoru „prevádzkové pohľady → úlohy → konfigurácia“. Providers & Connectors = Providers, Credentials.
8. **Locale:** `nav.providers.discovery` sa premenuje na `nav.discovery.settings` v en/cs/sk s rovnakými hodnotami a kľúč sa presunie za `nav.discovery.jobs`. `pages.discoverySettings.*` sa nemení.
9. **Provider závislosti:** iba relatívne importy `../../providers/...` sa zmenia na alias `@/features/providers-connectors/providers/...`. `providerTypeLabel`, `selectProviders` ani provider typy sa nepresúvajú.
10. **Historické dokumenty** (`tasks/discovery-*-plan.md`, `docs/superpowers/plans/2026-09-29-orval-full-integration.md`) sa neupravujú, sú to záznamy minulej práce. Grep kontrola starej cesty ich vynecháva.

## 3. Závislosti úloh

```
T1 fyzický presun + oprava importov (app ostáva na starej URL, iba nový import path)
 └─ T2 route ownership: routes.discoverySettings, nová route, legacy redirect so search
     └─ T3 sidebar + modulePageConfigs + nav locale
         └─ T4 audit závislostí (grep, bez refactoru, ak sa nič nenájde)
             └─ T5 finálna regresia a validácia
```

Každá úloha nechá aplikáciu funkčnú. Commity podľa CLAUDE.md §6:
- každá úloha, ktorá mení kód, končí atomickým commitom;
- T4 pri čistom audite nevytvára prázdny commit, iba zapíše výsledok do todo;
- ak audit nájde reálnu zmenu kódu, urobí sa minimálne a commitne atomicky.

Na začiatku implementácie (pred T1) si poznač baseline pre kontrolu renames: `$base = git rev-parse HEAD` (podľa tohto plánu `a1dc23c0`).

## 4. Úlohy

### T1 — Fyzický presun feature (M, takmer celý diff je `git mv`)

**Mení sa**
- `git mv src/features/providers-connectors/discovery-settings src/features/discovery-inventory/discovery-settings`, všetkých 19 súborov vrátane testov, mocks a `DiscoveryScheduleCard`.
- Rozbité relatívne importy (4 výskyty v 4 súboroch) sa menia na alias:
  - `DiscoveryHistoryCard.tsx`, `config/discoveryCacheHistoryColumns.tsx`, `pages/DiscoverySettingsPage.tsx`: `../../providers/helpers/providerTypeLabel` → `@/features/providers-connectors/providers/helpers/providerTypeLabel`;
  - súbor s `../../providers/model/providerTypes` (overiť grepom) → `@/features/providers-connectors/providers/model/providerTypes`.
- `src/app/AppRoutes.tsx`: iba cesta lazy importu na `@/features/discovery-inventory/discovery-settings/pages/DiscoverySettingsPage`.

**Nemení sa:** route, URL, sidebar, locale, správanie, test URL v `MemoryRouter`. Interné relatívne importy v rámci feature (`../model`, `../hooks`…) ostávajú platné.

**Akceptácia**
- `src/features/providers-connectors/discovery-settings/` neexistuje.
- V `src` nie je reťazec `providers-connectors/discovery-settings` okrem `routes.ts` (route ostáva do T2).
- Všetkých 7 presunutých testovacích súborov prechádza.
- Typecheck je zelený.

**Riziká**
- Git môže pri malých súboroch so zmeneným importom nerozpoznať rename. Mitigácia: zmeny importov sú jednoriadkové, `git diff -M --stat` overí renames.
- Vitest/ESLint konfigurácia s cestami: overené, žiadne explicitné cesty na discovery-settings.

**Závislosti:** žiadne.

### T2 — Route ownership (S)

**Mení sa**
- `src/app/routes.ts`:
  - `providerDiscoverySettings` sa odstráni;
  - pridá sa `discoverySettings: '/discovery-inventory/discovery-settings'` za `discoveryJobs`;
  - pridá sa `discoverySettingsLegacy: '/providers-connectors/discovery-settings'` (redirect-only, komentár).
- `src/app/AppRoutes.tsx`:
  - odstrániť vetvu `routes.providerDiscoverySettings` z `renderProvidersConnectorsRoutes`;
  - pridať `RedirectPreservingSearch`;
  - v Discovery Inventory bloku (za Infrastructure, pred placeholdermi) pridať `Route path={toRoutePath(routes.discoverySettings)} handle={{ contentScroll: 'contained' }}` so `Suspense`/`RouteLoadingSkeleton`/`DiscoverySettingsPage`;
  - pridať `Route path={toRoutePath(routes.discoverySettingsLegacy)} element={<RedirectPreservingSearch to={routes.discoverySettings} />}`. Legacy route musí byť definovaná **pred** `providers-connectors` catch-all, ak taký vznikne. Dnes catch-all pod `providers-connectors/*` neexistuje, iba index redirect.
- `src/app/modulePageConfigs.ts`: odstrániť položku Discovery Settings z `providersConnectorsPages`. Bez nej `AppSidebar` a `AppRoutes` kompilujú až po T3, preto sa `AppSidebar` riadok `routes.providerDiscoverySettings` v T2 dočasne prepne na `routes.discoverySettings`. Samotný presun položky do inej skupiny je až v T3.
- Testy:
  - `pages/DiscoverySettingsPage.test.tsx` a `pages/DiscoverySettingsPage.stubfetch.test.tsx`: `/providers-connectors/discovery-settings…` → `/discovery-inventory/discovery-settings…` (5 výskytov). Ide iba o reťazce; hook na ceste nezávisí.
  - `src/app/router.test.tsx`:
    - doplniť `['discovery-inventory/discovery-settings']` do contained routes;
    - overiť, že cesta existuje;
    - overiť, že `providers-connectors/discovery-settings` je redirect (nemá contained `handle`, element je redirect).
  - Nový test redirectu, napr. `src/app/discoverySettingsLegacyRedirect.test.tsx`.
    - Router vzniká **priamo cez `createMemoryRouter` nad `AppRoutes()`**:
      ```ts
      createMemoryRouter(
        createRoutesFromElements(AppRoutes()),
        {
          initialEntries: [
            '/providers-connectors/discovery-settings?tab=history&providerId=vmware-01#x',
          ],
        },
      )
      ```
    - `createAppRouter()` sa **nepoužije**: interne volá `createBrowserRouter()` a `initialEntries` neprijíma.
    - Overí sa výsledná location `router.state.location`: `pathname + search + hash` = `/discovery-inventory/discovery-settings?tab=history&providerId=vmware-01#x`. Tým sa potvrdí zachovanie `tab`, `providerId` aj hash.
    - Na overenie lokácie stačí router state, stránka sa nemusí renderovať. Ak test bude renderovať `RouterProvider`, potrebné providery (QueryClient, translation mock) prevziať zo vzoru existujúcich testov `AppShell.test.tsx` a `router.test.tsx`.

**Nemení sa:** Discovery Jobs route, ostatné legacy redirecty, `renderModulePageRoutes`.

**Akceptácia**
- Nová URL renderuje stránku s contained scrollom.
- Stará URL presmeruje so zachovaným `tab`, `providerId` aj hash.
- `routes.providerDiscoverySettings` v kóde neexistuje.

**Riziká**
- Strata query stringu pri redirecte. Mitigácia: dedikovaný komponent + test so všetkými parametrami.
- Iné stránky odkazujúce na `routes.providerDiscoverySettings`: grep potvrdil iba AppRoutes, modulePageConfigs a AppSidebar.

**Závislosti:** T1.

### T3 — Navigácia, module config a nav locale (S)

**Mení sa**
- `src/layouts/app-shell/AppSidebar.tsx`:
  - odstrániť Discovery Settings z `Providers & Connectors`;
  - pridať `{ name: 'Discovery Settings', path: routes.discoverySettings }` za Discovery Jobs;
  - `navKeyMap['Discovery Settings'] = 'nav.discovery.settings'` a mapu preusporiadať do skupiny `nav.discovery.*`.
- `src/locales/en.json`, `cs.json`, `sk.json`: `nav.providers.discovery` sa premenuje na `nav.discovery.settings` s rovnakými hodnotami (en „Discovery settings“, cs „Nastavení zjišťování“, sk „Nastavenia zisťovania“) a riadok sa presunie za `nav.discovery.jobs`.
- `src/layouts/app-shell/AppSidebar.test.tsx`, nové testy:
  - na `/discovery-inventory/discovery-settings` je aktívna skupina Discovery & Inventory a odkaz „Discovery settings“ má `href` `/discovery-inventory/discovery-settings`;
  - poradie položiek Discovery & Inventory: Resources, Resources ISE, Infrastructure topology, Discovery jobs, Discovery settings;
  - skupina Providers & Connectors obsahuje iba Providers a Credentials;
  - Discovery jobs ostáva s `href` `/discovery-inventory/discovery-jobs`.

**Nemení sa:** ikony a skupiny, iné nav kľúče, `pages.discoverySettings.*`, `discoveryInventoryPlaceholderPages`.

**Akceptácia**
- `nav.providers.discovery` neexistuje v kóde ani v locale.
- en/cs/sk majú rovnakú množinu `nav.*` kľúčov.
- Sidebar testy prechádzajú.

**Riziká:** iné použitie `nav.providers.discovery` (napr. hlavička, help). Grep v T3 musí byť prázdny.

**Závislosti:** T2.

### T4 — Audit závislostí po presune (XS, primárne kontrola)

- Grep importov `src/features/discovery-inventory/discovery-settings/**` mimo feature, `@/shared`, `@/generated`, `@/hooks`, `react*`, testovacích knižníc.
- Očakávaný výsledok: iba `@/features/providers-connectors/providers/{helpers/providerTypeLabel, model/selectProviders, model/providerTypes}`, teda provider doména, ponechať.
- Kontrola opačného smeru: `providers-connectors/**` nesmie importovať z `discovery-inventory/discovery-settings`.
- Code zmena **iba** ak grep nájde generický helper (napr. formátovanie, ktoré nie je provider-doménové). Vtedy ho najmenším krokom presunúť do `src/shared/...`. Ak sa nič nenájde, úloha končí zápisom výsledku do todo, bez commitu kódu.

**Závislosti:** T1–T3.

### T5 — Regresia a finálna validácia (S)

Overiť (existujúce + nové testy z T2/T3):
- Configuration: load, load error + retry, draft, validácia, save, cancel, chyba mutácie (`DiscoverySettingsPage.test.tsx`, `.stubfetch.test.tsx`, `useDiscoveryCacheConfigDraft.test.tsx`, `discoveryCacheConfigDraft.test.ts`);
- History: filter providera, zoznam providerov, `providerId`, refresh, loading, cached/error, stránkovanie, empty (`DiscoveryHistoryCard.test.tsx`, stubfetch);
- Notifications local-only: recipient, enable/disable, save, cancel, send test, local-only text (`DiscoverySettingsPage.test.tsx`, `DiscoverySettingsLocalCards.test.tsx`);
- Schedule karta (`DiscoverySettingsLocalCards.test.tsx`);
- Search params (`useDiscoverySettingsSearchParams.test.tsx`);
- Nová route, legacy redirect so search a hash, contained handle (router testy);
- Sidebar ownership, poradie a Discovery Jobs placeholder (`AppSidebar.test.tsx`, router test placeholder cesty).

Žiadna zmena kódu. Ak niečo zlyhá, oprava patrí do príslušnej úlohy.

## 5. Validačné príkazy

```powershell
$f = 'src/features/discovery-inventory/discovery-settings'
npm exec vitest run "$f/pages/DiscoverySettingsPage.test.tsx" "$f/pages/DiscoverySettingsPage.stubfetch.test.tsx" "$f/components/DiscoveryHistoryCard.test.tsx" "$f/components/DiscoverySettingsLocalCards.test.tsx" "$f/helpers/discoveryCacheConfigDraft.test.ts" "$f/hooks/useDiscoveryCacheConfigDraft.test.tsx" "$f/hooks/useDiscoverySettingsSearchParams.test.tsx"
npm exec vitest run src/app/router.test.tsx src/app/resourcesContainedRoutes.test.tsx src/app/discoverySettingsLegacyRedirect.test.tsx src/layouts/app-shell/AppSidebar.test.tsx src/layouts/app-shell/SidebarFlyout.test.tsx src/layouts/app-shell/AppShell.test.tsx
npm exec vitest run src/locales
# stará feature cesta a route konštanta nesmú mať referencie (historické tasks/ a docs/superpowers vynechané)
git grep -n "providers-connectors/discovery-settings" -- src scripts eslint.config.js vitest.config.ts   # očakávané: iba routes.ts discoverySettingsLegacy
git grep -n "providerDiscoverySettings\|nav.providers.discovery" -- src                                  # očakávané: prázdne
Test-Path src/features/providers-connectors/discovery-settings                                           # očakávané: False
# parita nav kľúčov
node -e "const k=['en','cs','sk'].map(l=>Object.keys(require('./src/locales/'+l+'.json')).filter(x=>x.startsWith('nav.')).sort().join());console.log(new Set(k).size===1?'NAV OK':'NAV MISMATCH')"
$changed = @(git diff --name-only HEAD -- '*.ts' '*.tsx') + @(git ls-files --others --exclude-standard -- '*.ts' '*.tsx')
npx eslint --max-warnings 0 $changed
node scripts/orval/check-feature-layout.mjs
npm run typecheck
git diff --check
git diff -M --stat "$base..HEAD"   # $base zo začiatku implementácie (a1dc23c0); presunuté súbory musia byť renames (R100 / R0xx)
```

Celý test suite ani production build sa podľa CLAUDE.md §5 nespúšťajú. Orval, OpenAPI, spec patche a `src/generated/**` sa nemenia.

## 6. Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Legacy redirect zahodí `?tab`/`providerId` | Vysoký (rozbité záložky a odkazy) | `RedirectPreservingSearch` + test so všetkými parametrami a hash |
| Relatívne `../../providers/...` importy po presune | Vysoký (kompilácia) | Prepis na alias v T1, typecheck |
| Sidebar zvýrazní zlú skupinu | Stredný | Sidebar test aktívnej skupiny na novej URL |
| Contained scroll handle sa stratí pri presune route | Stredný | Doplnenie do `router.test.tsx` contained zoznamu |
| Git nerozpozná renames | Nízky | Jednoriadkové zmeny importov, kontrola `git diff -M --stat "$base..HEAD"` |
| Zabudnutý `nav.providers.discovery` v jednom jazyku | Nízky | Parita `nav.*` + grep |
| Paralelná práca v `AppSidebar`/`AppRoutes` (napr. plán section accents) | Nízky | Iné súbory; pri konflikte rebase, nie prepis |

## 7. Otvorené otázky

Žiadne blokujúce. Na potvrdenie pri review:
- Discovery Settings ako posledná položka Discovery & Inventory, za Discovery Jobs.
- Ponechanie legacy redirectu `/providers-connectors/discovery-settings` (odporúčané kvôli záložkám a odkazom) s konštantou `discoverySettingsLegacy`.
