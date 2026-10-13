# Implementačný plán: Globálny test pripojenia providerov

## Rozsah a východiská

Plán pokrýva migráciu existujúceho Infrastructure Provider testu a doplnenie testu AIRFLOW Platform Providera. V tejto fáze sa upravujú len tento dokument a zodpovedajúci TODO; produkčný FE, BE, OpenAPI a generované Orval súbory zostávajú bez zmeny. Pri implementácii zachovať cudzie zmeny pracovného stromu.

Dnešný `ProvidersCatalogueTable` vlastní `useTestProvider`, viditeľnosť dialógu a `resetQueries`. `PlatformProvidersTable` má detail s `KeyedHelpPopover`, no nemá testovaciu akciu. `ChecklistResultDialog` zobrazuje každý ne-`ok` stav červeno a počas `isPending` vypína Close/backdrop; `Modal` aj tak povoľuje Escape. `AppProviders` je nad `AppRouter` a obsahuje spoločný `QueryClient`. Preto môže nový manager a host prežiť odmontovanie routovanej stránky. Globálne query defaults majú retry a automatický refetch; pre side-effecting testy sa nesmú použiť.

## Kontrakt a hranice

| Oblasť | Overený kontrakt |
|---|---|
| Infrastructure | `GET /test_provider?provider_id=...`; generované `getTestProviderQueryOptions` a `getTestProviderQueryKey` |
| Platform | `GET /test_platform_provider?provider_id=...`; generované `getTestPlatformProviderQueryOptions` a `getTestPlatformProviderQueryKey`; BE vyžaduje `RUN_HEALTH_CHECK` a podporuje len AIRFLOW |
| Výsledok | Oba endpointy vracajú `ProviderTestResponse`: `provider_id`, `provider_type`, `ok` a pole `checks` s `name/status/detail`. HTTP 200 s `ok: false` je dokončený neúspešný test, HTTP/network chyba je iná vetva. |
| Airflow | Šesť kontrol v poradí `airflow_url`, `airflow_auth`, `airflow_sftp`, `airflow_dag_load`, `airflow_dag_parsed`, `airflow_cleanup`; `ok/failed/skipped`. BE polling je 3 s a parse timeout 60 s; požiadavka môže trvať dlhšie. |
| Infra stavy | `timeout` a iné neznáme ne-`ok` stavy zostávajú chybové. |
| Transport | Generované query options používajú existujúci `validatingMutator` a `apiFetch`; autentifikácia a Zod validácia zostávajú zachované. |

## Cieľová architektúra

### Vlastníctvo a React hranica

`ConnectionTestManager` žije pod `AppProviders`, ale nad `AppRouter`. Vlastní synchronizáciu behov, malé metadáta, in-flight Promise, viditeľný výsledok a front notifikácií. `QueryClient` vlastní request, výsledok a error; manager nekopíruje telo `ProviderTestResponse` do druhej cache. `ConnectionTestHost` na rovnakej globálnej úrovni zobrazuje jediný `ConnectionTestResultDialog` a `ConnectionTestNotification`. Tabuľky len overujú viditeľnosť/credential, zavolajú `startTest` alebo `openResult` a podľa selektívne odoberaného stavu skryjú vlastný `DetailView`.

Stabilný Context poskytne iba akcie `startTest`, `openResult`, `closeResult`, `dismissNotification` a selektívny odber `getProviderTestState(kind, providerId)`; store poskytne stabilné snapshoty pre `useSyncExternalStore`. Zmena jedného behu neaktualizuje Context value ani neprekresľuje `AppShell`, sidebar a cudzie stránky. Manager nepoužíva Redux, globálny polling ani `localStorage`.

Identita providera je dvojica `infrastructure:<providerId>` alebo `platform:<providerId>`. Každý nový beh má monotónne `runId` a autentifikačný `sessionScope`. Manager uchováva iba nevyhnutné metadáta (kind, id, zobrazené meno, **infra `providerRole: 'source' | 'target'`**, runId, queryKey, fázu a in-flight Promise), nie heslá, credential payload ani kópiu výsledku. Source/Target rola sa zachytí pri štarte infra testu a zostáva dostupná po navigácii; AIRFLOW rolu nedostane. **Bezpečná izolácia relácie:** `AuthProvider` je v `src/main.tsx` nad `AppProviders`, a `useAuthContext()` (`src/contexts/AuthContext.ts`) poskytuje skutočnú auth identitu; hardcoded `UserProvider` nie je zdroj relácie. `mapKeycloakProfile.ts` pri neúplnom profile používa fallback `id: 'unknown'`. V auth-enabled režime sa pri `unknown`/prázdnom ID **nesmie spustiť test** a táto hodnota nesmie slúžiť ako spoločný session scope. Scope má rozlišovať konkrétne prihlásenie (session generation + platná identita), nemeniť sa pri bežnom token refreshi. Pri logout/switch/neplatnej relácii vymazať staré UI/notifikácie aj testové queries, neskoré settle ignorovať. Ak `AuthContext` nevystavuje spoľahlivú hranicu relácie, T4 musí zdokumentovať nutné minimálne rozšírenie `AuthProvider/AuthContext`; samotný `user.id` nestačí na všetky scenáre. Pri `AUTH_ENABLED=false` použiť jedinečný dev scope pre životnosť aktuálnej aplikácie, nie `unknown`. Query key obsahuje scope. Bez localStorage perzistencie.

### Presný request algoritmus

1. `startTest(kind, id, name, providerRole?)` synchrónne preverí mapu aktívnych behov. Ak pre tú istú dvojicu existuje pending beh, otvorí pôvodný loading bez ďalšieho GET. Infra rola sa uloží z vybraného providera; AIRFLOW rolu neodovzdáva. Rôzni provideri môžu bežať paralelne. Pri novom behu **po dokončení** sa odstráni neaktuálna notifikácia/výsledok tej istej identity. Pred novým requestom rezervovať kapacitu podľa kroku 6.
2. Inak pridelí nový `runId`, uloží pending metadáta ešte pred asynchrónnym volaním a vytvorí query options cez príslušný generovaný `getTest…QueryOptions`. Do `queryKey` pridá session scope a runId. Tým je nový explicitný beh vždy nový HTTP request; starý dokončený výsledok rovnakej identity sa pritom explicitne vyčistí podľa kroku 5. Nastaví `retry: false`, `staleTime: 0`, `refetchOnWindowFocus/Mount/Reconnect: false` a žiadny interval; `queryClient.fetchQuery(options)` vykoná request. Nepoužíva `resetQueries` na aktívnom observeri ani `useTest…` hook ako vlastníka requestu.
3. Promise settle načíta result/error z presného QueryClient key. Pred publikovaním overí session scope a aktuálny runId, aby oneskorený starý beh neprepísal novší. Dokončenie pri otvorenom dialógu prepne ten istý dialóg na výsledok bez notifikácie. Dokončenie pri skrytom dialógu pridá jednu globálnu notifikáciu. HTTP 200 s `ok: false` je dokončený výsledok s chybovým tónom a možnosťou Retry.
4. `closeResult` mení iba viditeľnosť. Neruší Promise ani fetch, neresetuje cache, nespúšťa refetch a neoznačuje BE prácu za zrušenú. `openResult(runId)` len číta presný QueryClient key; nikdy nevolá `fetchQuery`. `startTest` po dokončení a `Retry` založia nový runId a nový GET.
5. **Maximálne 5 súčasne viditeľných notifikácií, nie 5 uložených výsledkov.** Ďalšie dokončené nevybavené výsledky zostanú vo FIFO fronte a postupne sa zobrazia; bez akcie používateľa sa nepotvrdené oznámenie ani jeho výsledok nesmie stratiť. Každý zobrazený/čakajúci odkaz musí mať platný Query key. Testové query majú lokálne `gcTime: Infinity` počas životnosti managera a **explicitný cleanup** po dismiss, po otvorení a následnom zavretí výsledku, po nahradení novým behom tej istej identity alebo pri zmene relácie. `openResult` číta iba Query cache bez GET; výsledok sa neodstraňuje, kým ho modal používa. Nekopírovať response payload do druhej cache.
6. **Bounded memory bez tichej evikcie:** zaviesť konfigurovateľný bezpečnostný limit, napr. 20 rezervovaných slotov pre pending + nepotvrdené + práve prezerané výsledky. Slot rezervovať synchrónne pred HTTP requestom, deduplikovaný pending nevytvára ďalší slot. Pri plnej kapacite (ak nemožno nahradiť už dokončený výsledok toho istého providera) nový test **nespustiť** a zobraziť jasný dôvod s možnosťou uvoľniť miesto spracovaním notifikácií. Nemaž iný pending/nepotvrdený výsledok. Po dismiss/zavretí uvoľniť slot, metadata a nepotrebný Query key. Otestovať limit, uvoľnenie a ďalší beh.

`fetchQuery` má explicitný request key s runId aj `staleTime: 0`, preto nie je závislý od časovej hranice stale cache. In-flight mapa zaručuje deduplikáciu; unikátny key zaručuje nový request pre vedomý nový beh. Použiť generovanú queryFn vrátane AbortSignal transportu, no odmontovanie stránky neodmontuje manager ani nevolá `cancelQueries`. Odlíšiť skrytie dialógu od zrušenia práce. Browser reload alebo zatvorenie tabu nie je obnoviteľné bez BE task/status API.

### UI, modal a focus

`ConnectionTestButton` zdieľa existujúci `Button`/`PlugIcon`, veľkosť, farbu a disabled hint; rozhodnutie o type a credentials ostáva v tabuľkách. `ConnectionTestResultDialog` je jediné výsledkové okno nad `ChecklistResultDialog` pre infra aj AIRFLOW. Infra ponechá typ a Source/Target badge podľa zachytenej `providerRole` konkrétneho behu, aj po opustení pôvodnej stránky; AIRFLOW má badge AIRFLOW bez roly. Loading neskryje len spinner, ale aj starý checklist/Response Body a počítadlo. Celkové hodnotenie riadi `response.ok`; úspechy počítajú iba `ok`. `skipped` je neutrálne, `failed`, `timeout` a ostatné neznáme ne-`ok` sú chybové. Response Body zobrazuje pôvodný JSON a názov `ProviderTestResponse`.

Connection test modal má Close a Escape funkčné aj počas pending, backdrop ho **nikdy** nezavrie. Zaviesť len voliteľné props do `ChecklistResultDialog` pre povolenie pending Close a vypnutie backdrop; defaulty ostatných spotrebiteľov sa nemenia. Nedotýkať sa všeobecného defaultu `Modal`. Zobrazenie globálneho result modalu pri lokálnom provider detaile najprv odmontuje príslušný `DetailView`, takže `dialogStack` obsahuje iba jeden aktívny modal. Notifikácia leží pod modal backdrop a nedá sa otvoriť cez iný aktívny modal. Po Close sa detail na stále dostupnej provider stránke namountuje; focus sa po commite vráti na nový živý trigger, nie na odmontovaný openerRef. Po navigácii sa focus presunie na stabilný prvok aktuálnej stránky, keď pôvodný trigger neexistuje. Oneskorené dokončenie samo nikdy neotvorí modal ani nezmení selection.

`ConnectionTestNotification` preberá iba vzhľad a interakcie schváleného root `connection-notification-prototype.html`; nie jeho starý drawer. Je to neblokujúca plávajúca karta vpravo hore s projektovými tokenmi pre light/dark, menom, stručným úspechom/chybou, tlačidlom zavretia a lokalizovaným „Zobraziť výsledok“. Nemá backdrop ani timeout. Odkaz otvorí existujúci globálny výsledkový dialóg z platnej, až do potvrdenia uchovanej Query cache bez HTTP requestu. Limit piatich kariet je iba vizuálny; čakajúce výsledky neexpirujú. Pri novom teste toho istého providera sa stará neaktuálna notifikácia odstráni. Pri zániku notifikácie zabezpečiť bezpečný focus fallback.

### Stavové prechody

| Udalosť | Nový request? | Viditeľný UI |
|---|---:|---|
| Klik Test connection bez pending | Áno, presne jeden | Loading modal; lokálny detail skrytý |
| Klik Test connection pri pending tej istej identity | Nie | Pôvodný loading modal |
| Close/Escape počas pending | Nie | Modal skrytý, detail späť; request beží |
| Backdrop click | Nie | Bez zmeny |
| Sidebar navigácia po Close | Nie | Manager zostáva namountovaný |
| Dokončenie pri otvorenom modale | Nie | Výsledok v tom istom modale, bez toastu |
| Dokončenie pri skrytom modale | Nie | Jedna neblokujúca notifikácia |
| Zobraziť výsledok | Nie | Existujúci výsledok v spoločnom modale |
| Test connection po dokončení / Retry | Áno | Nový runId, stará notifikácia rovnakej identity sa odstráni, bez starých dát |
| Šiesta nevybavená notifikácia | Nie (dokončenie bežiaceho testu) | Čaká vo FIFO, piatich viditeľných sa nedotýka; payload zostáva v cache |
| Nový test pri plnej kapacite | Nie | Zobrazí sa dôvod, žiadna tichá strata cudzieho výsledku |

## Presný súborový rozsah

| Vytvoriť | Upraviť |
|---|---|
| `src/shared/components/button/ConnectionTestButton.tsx` | `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx` a `ProvidersCatalogueTable.test.tsx` |
| `src/shared/components/modal/ConnectionTestResultDialog.tsx` a `ConnectionTestResultDialog.test.tsx` | `src/shared/components/modal/ChecklistResultDialog.tsx` a `ChecklistResultDialog.test.tsx`; `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx` a `ProviderConnectionTestDialog.test.tsx` |
| `src/shared/connection-test/ConnectionTestManager.ts`, `ConnectionTestManager.test.ts`, `ConnectionTestContext.tsx`, `ConnectionTestContext.test.tsx` | `src/app/providers.tsx` |
| `src/shared/connection-test/ConnectionTestHost.tsx` a `ConnectionTestHost.test.tsx`; `src/shared/components/notification/ConnectionTestNotification.tsx` a `ConnectionTestNotification.test.tsx` | `src/locales/en.json`, `sk.json`, `cs.json` |
| — | `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx` a `PlatformProvidersTable.test.tsx`; `src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx` |

`src/app/App.tsx`, router, `AppShell`, API klienti, BE, OpenAPI a Orval sú iba referencie. Ak test auth/session odhalí nutnosť upraviť `AuthProvider.tsx`, najprv zdokumentovať konkrétny dôvod v pláne; schválený návrh číta overenú auth identitu cez `useAuthContext()`; `unknown` je fallback, nie bezpečný identifikátor relácie. Pri absencii signálu relácie rozšíriť auth kontrakt s minimálnym dopadom.

## Fázy a úlohy

### Fáza 1 — Shared UI

#### T1: Zdieľať tlačidlo

**Účel a zodpovednosť:** `ConnectionTestButton` iba vykresľuje súčasný vizuál, text a disabled hint; tabuľky vlastnia viditeľnosť a povolenie.
**Tok/kroky:** Nahradiť inline konfiguráciu infra tlačidla, zachovať `onClick` ako odovzdanú akciu a pôvodné `aria-describedby`/`title`. Nespúšťať API v komponente.
**Akceptácia/testy:** Rovnaký vzhľad a správanie infra tlačidla, disabled reason dostupný screen readeru. Rozšíriť `ProvidersCatalogueTable.test.tsx`; focused Vitest/ESLint.
**Súbory:** nový `src/shared/components/button/ConnectionTestButton.tsx`; úpravy `ProvidersCatalogueTable.tsx` a `ProvidersCatalogueTable.test.tsx`. **Závislosti:** žiadne. **Rozsah:** 3 súbory.

#### T2: Checklist a spoločný výsledkový dialóg

**Účel a zodpovednosť:** `ChecklistResultDialog` je vizuálny základ; `ConnectionTestResultDialog` mapuje `ProviderTestResponse` na loading, status, checklist, Retry, badges a Response Body; infra adaptér dodá rolu.
**Tok/kroky:** Zaviesť voliteľné scoped props pre pending Close a vypnutý backdrop; povoliť Escape. Neutrálny `skipped` a voliteľný skipped count; existujúci lokalizovaný passed count, checks aria-label. Doplniť len potrebné EN/SK/CS texty. Infra `timeout` a neznámy ne-`ok` zostanú chybové.
**Akceptácia/testy:** Modal možno skryť počas pending, backdrop ho nikdy nezavrie; loading nemá staré dáta; infra badge roly a AIRFLOW bez roly; HTTP 200 `ok: false` má kontroly/Retry; HTTP error má fallback; JSON má `ProviderTestResponse`. Testy `ChecklistResultDialog.test.tsx`, nový `ConnectionTestResultDialog.test.tsx` a `ProviderConnectionTestDialog.test.tsx` vrátane prepísania starej disabled Close asercie; EN/SK/CS.
**Súbory:** nový `src/shared/components/modal/ConnectionTestResultDialog.tsx` a `ConnectionTestResultDialog.test.tsx`; úpravy `ChecklistResultDialog.tsx`, `ChecklistResultDialog.test.tsx`, `ProviderConnectionTestDialog.tsx`, `ProviderConnectionTestDialog.test.tsx` a troch locale JSON. **Závislosti:** T1 iba pre neskoršie tabuľkové zapojenie, samotné T2 môže bežať nezávisle. **Rozsah:** rozdeliť implementačný commit na checklist+locale (5 súborov) a dialóg+adaptér (4 súbory).

**Checkpoint C1:** Focused testy shared UI a infra regresia prechádzajú; všetky locale sú validné; generované súbory nedotknuté.

### Fáza 2 — Globálny ConnectionTestManager

#### T3: Run store a QueryClient bridge

**Účel a zodpovednosť:** Manager vlastní identitu, in-flight deduplikáciu a životný cyklus; `QueryClient` vlastní payload/error.
**Tok/kroky:** Implementovať dve identity, runId a session scope; infra `providerRole` zachytiť pri `startTest`, bez zmeny AIRFLOW. Synchrónny zápis pending aj rezervácia kapacity pred `fetchQuery`; generované options s unikátnym key a vypnutým retry/refetch; settle guard runId/session; `startTest/openResult/closeResult` a selektívne snapshoty. Jeden pending na identitu, rôzne identity paralelne. Nový beh rovnakého providera vyradí predchádzajúcu notifikáciu/výsledok. Close nemení Promise. Plný limit nový request odmietne, bez tichej evikcie.
**Akceptácia/testy:** Žiadny request pred akciou; dve rýchle volania pre tú istú identitu vrátia jeden beh/GET; odlišné identity bežia paralelne; nový completed run vykoná nový GET; reopen a openResult bez GET; starý výsledok sa neukáže počas nového loadingu. Simulovať >60 s pending bez FE timeoutu, HTTP 200 `ok: false` aj HTTP/network error.
**Súbory:** nové `src/shared/connection-test/ConnectionTestManager.ts` a `ConnectionTestManager.test.ts`. **Závislosti:** kontrakt vyššie; T2 môže prebiehať nezávisle. **Rozsah:** 2 súbory.

#### T4: Globálne napojenie, relácia a bounded cleanup

**Účel a zodpovednosť:** Stabilné akcie a selektívne odbery zostávajú nad routerom; výsledky sa uchovajú do explicitného spracovania alebo nahradenia a celkové množstvo je bezpečne limitované.
**Tok/kroky:** `ConnectionTestContext` poskytne stabilný Context a `useSyncExternalStore` selektory. `AppProviders` cez `useAuthContext()` získa overenú identitu a session generation, vytvorí manager s QueryClient a zachová ho cez route zmeny; pri `unknown`/neplatnej identite v auth-enabled režime zakáže nové testy, dev bypass má vlastný dočasný scope. Pri zmene relácie odstráni staré query a UI, neskoré settle ignoruje. Max. 5 **viditeľných** notifikácií; ďalšie čakajú bez straty s platným Query key. Rezervovať max. 20 aktívnych/nevybavených slotov, plný limit nový test odmietne a po potvrdení výsledkov sa uvoľní. Bez hesiel, perzistencie či pollingu. Overiť React StrictMode mount/effect replay.
**Akceptácia/testy:** Navigácia/odmontovanie tabuľky neabortuje test; v auth-enabled režime `unknown` blokuje štart, dev bypass funguje a zmena relácie nikdy nezobrazí staré výsledky. Žiadna nepotvrdená notifikácia nestratí payload ani po dlhom čakaní; maximálne 5 kariet je súčasne viditeľných a limit slotov neevikuje pending/nespracované výsledky, len odmietne ďalší test so zrozumiteľným dôvodom. AppShell/nesúvisiace stránky sa pri progress update neprekresľujú.
**Súbory:** nové `src/shared/connection-test/ConnectionTestContext.tsx` a `ConnectionTestContext.test.tsx`; úprava `src/app/providers.tsx`; rozšírenie `ConnectionTestManager.ts` a `ConnectionTestManager.test.ts`. **Závislosti:** T3. **Rozsah:** 5 súborov.

**Checkpoint C2:** Manager testy pokrývajú deduplikáciu, paralelizmus, navigáciu, infra rolu, nahradenie starej notifikácie novým behom tej istej identity, reláciu (`unknown`, dev režim), rezerváciu/uvolnenie kapacity a cleanup; výsledok zostáva len v Query cache.

### Fáza 3 — Globálny host a notifikácia

#### T5: Jeden výsledkový host a neblokujúca notifikácia

**Účel a zodpovednosť:** `ConnectionTestHost` číta vybraný run z managera/QueryClient a renderuje jediný shared modal; `ConnectionTestNotification` iba oznamuje dokončenie pri skrytom modale.
**Tok/kroky:** Host namountovať v `AppProviders` nad routerom. Vizuál podľa `connection-notification-prototype.html` preniesť pomocou projektových tokenov. FIFO bez automatického mazania, max. 5 **súčasne viditeľných** kariet (ďalšie čakajú s uloženým výsledkom), bez overlay/backdrop a bez timeoutu; success/error tón, provider name, localized summary, „Zobraziť výsledok“, dismiss. OpenResult číta cache; modal sa po dokončení otvoreného testu len aktualizuje, bez toastu. Zabezpečiť focus návrat a modal stack.
**Akceptácia/testy:** Dokončenie skrytého testu vytvorí jednu notifikáciu na každej route; výsledok otvorený aj po dlhom čakaní z platnej Query cache bez GET. Šiesta notifikácia zostane v rade a zobrazí sa po spracovaní jednej z piatich; nový test rovnakej identity odstráni jej starú notifikáciu. Otvorený modal nevytvorí toast; karty sa neprekrývajú, neblokujú akcie a fungujú na mobile/light/dark; nad cudzím modalom sa nedá aktivovať ďalší modal.
**Súbory:** nové `src/shared/connection-test/ConnectionTestHost.tsx`, `ConnectionTestHost.test.tsx`, `src/shared/components/notification/ConnectionTestNotification.tsx` a `ConnectionTestNotification.test.tsx`; úpravy `src/app/providers.tsx` a troch locale JSON. **Závislosti:** T2–T4. **Rozsah:** rozdeliť na host (3 súbory) a notifikáciu+locale (4 súbory).

**Checkpoint C3:** Globálny host zostáva viditeľný/aktívny po route zmene, toast sa zobrazí iba pri skrytom výsledku a „Zobraziť výsledok“ nevykoná request.

### Fáza 4 — Migrácia Infrastructure Providers

#### T6: Presun infra testu na manager

**Účel a zodpovednosť:** Tabuľka vlastní len selection/credential guard a skrytie detailu; request a výsledok vlastní manager.
**Tok/kroky:** Odstrániť lokálne `useTestProvider`/`resetQueries`/`isConnectionTestOpen`. Tlačidlo volá `startTest('infrastructure', selected.id, selected.name, selected.role)`; pri pending opakovaný klik otvorí ten istý run. Detail je skrytý len pri viditeľnom globálnom výsledkovom modale pre vybraný provider. Close/Escape obnoví detail/focus, backdrop nič; pending pokračuje po navigácii. Infra adaptér dodáva Source/Target badge z globálnych metadát behu, nie zo stránky, ktorá už môže byť odmontovaná.
**Akceptácia/testy:** Doterajšie infra success/error/Retry/credentials/role fungujú; `providerRole` zostane správna aj v globálnom výsledku otvorenom z notifikácie na inej route. Close→reopen pending bez druhého GET; dokončenie na inej route vyvolá notifikáciu, nie modal; timeout/unknown sú červené; modal stack a focus sú správne.
**Súbory:** `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`, `ProvidersCatalogueTable.test.tsx`; `ProviderConnectionTestDialog.tsx` a `ProviderConnectionTestDialog.test.tsx` len ak nie sú už finálne z T2. **Závislosti:** T1–T5. **Rozsah:** 2–4 súbory.

**Checkpoint C4:** Infra test plne funguje cez globálny manager pred zapojením AIRFLOW; žiadna stránka nevlastní testovací Promise.

### Fáza 5 — AIRFLOW Platform Provider

#### T7: AIRFLOW tlačidlo a napojenie

**Účel a zodpovednosť:** Platform tabuľka iba vyberá AIRFLOW, overuje `credentialStatus === 'ok'` a volá globálne akcie.
**Tok/kroky:** V headeri vedľa existujúceho HelpPopover zobraziť shared tlačidlo len pre AIRFLOW. Zachytiť ID/názov/typ bez credentials; manager používa kind `platform` a generované platform query options. Skryť detail iba pri viditeľnom výsledkovom modale danej identity; po Close ho obnoviť s focusom. Badge AIRFLOW bez Source/Target. Pre SMTP/BACKEND/KEYCLOAK nemeniť UI/CRUD.
**Akceptácia/testy:** Správne `provider_id` a jeden GET; disabled dôvod pri chýbajúcom credential; šesť kontrol, skipped, `ok: false`, HTTP/network error; Close/reopen/navigácia/notifikácia/Retry podľa lifecycle tabuľky; pri výmene selected provider sa výsledky nezmiešajú.
**Súbory:** `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx` a `PlatformProvidersTable.test.tsx`; `src/features/platform-administration/platform-providers/model/platformProvidersWire.test.tsx`. Test wrapper musí doplniť QueryClientProvider alebo mock stabilných manager akcií, lebo dnes mockuje iba `useDeletePlatformProvider`. **Závislosti:** T6. **Rozsah:** 3 súbory.

**Checkpoint C5:** Oba druhy providerov používajú jedného managera, jeden výsledkový modal a rovnakú notifikáciu; iné platform typy sú bez zmeny.

### Fáza 6 — Cielená regresia a vizuálne overenie

#### T8: Koncové scenáre a verifikácia

**Účel:** Potvrdiť reálny lifecycle cez router, dlhý request a obmedzenú cache.
**Tok/testy:** Integračný test s `AppProviders` a navigáciou: pending → Close/Escape → iná route → dokončenie → notifikácia → Zobraziť výsledok bez GET; otvorený modal dokončí bez notifikácie. Duplicitný klik tej istej identity, paralelné odlišné identity, nový run po dokončení, starý výsledok po novom runId, session switch vrátane `unknown`/dev režimu, 6+ notifikácií bez straty, ochranu Query záznamu pred GC, plný limit slotov a jeho uvoľnenie, cleanup bez zahodenia pending, StrictMode, focus a `dialogStack`. Wire test pre oba endpointy/validáciu/auth. Vizuálne desktop/mobil, light/dark, dlhé meno, viac toastov, loading, Response Body.
**Akceptácia:** Focused Vitest a ESLint pre zmenené súbory, `npm run typecheck`, parse EN/SK/CS JSON a `git diff --check` prejdú. Kompletný suite ani produkčný build sa nespúšťajú bez konkrétneho dôvodu. Po verifikácii commitnúť iba súbory patriace aktuálnej implementačnej úlohe podľa `AGENTS.md`.
**Súbory:** existujúce/nové testy uvedené pri T1–T7; ak treba samostatný route integration test, `src/shared/connection-test/ConnectionTestFlow.test.tsx`. **Závislosti:** T7. **Rozsah:** testy rozdeliť podľa scenárov, bez novej produkčnej abstrakcie.

**Checkpoint C6:** Všetky akceptačné kritériá nižšie prechádzajú, diff je úzky a pripravený na review.

## Riziká a technické rozhodnutia

| Riziko | Opatrenie |
|---|---|
| Side-effecting GET a implicitný refetch | Imperatívny `fetchQuery` iba zo `startTest`, lokálne `retry: false` a unikátny run key; žiadny enabled observer, reset, polling ani prefetch. |
| Dlhý request / unmount stránky | Manager a QueryClient sú nad routerom; Close/route change neuplatní cancel ani abort. Výsledok získa host po settle. F5/browser close nie sú obnoviteľné. |
| Duplicate click a race | Synchrónna pending mapa podľa `kind:id` pred fetch; jeden Promise. RunId/session guard zahodí neskorý settlement. |
| Paralelné behy a pamäť | Max. 5 viditeľných kariet, ďalšie čakajú bez straty; Query cache až do potvrdenia výsledku, explicitný cleanup a kapacitný limit rezervovaný pred requestom, bez tichej evikcie. |
| Iný prihlásený používateľ | Scope podľa platnej auth identity a generácie relácie z AuthContext; `unknown` v auth-enabled režime blokuje štart, dev bypass má vlastný scope. Pri logout/switch reset UI/notifications/query a ochrana pred neskorým settle. |
| Focus a modal stack | Detail pred globálnym modalom odmontovať; vrátiť focus na remountnutý trigger, pri navigácii na bezpečný aktuálny prvok. Toast pod modal overlay. |
| Shared UI regresia | Nové pending Close/backdrop props sú voliteľné len pre connection test; infra `timeout` a neznáme stavy stále chybové; ostatní spotrebitelia `ChecklistResultDialog` zachovajú defaulty. |

## Finálne akceptačné kritériá

- [ ] Tlačidlo má identický vzhľad; AIRFLOW je jediný testovateľný platform typ a potrebuje platné credentials.
- [ ] Jeden spoločný manager a QueryClient pre oba endpointy; jeden pending beh na identitu, paralelné odlišné identity, nový explicitný beh vždy nový GET.
- [ ] Close/Escape fungujú počas pending bez abortu, backdrop nikdy nezatvára connection test, request prežije route change.
- [ ] Dokončenie pri skrytom modale vyvolá jednu neblokujúcu notifikáciu; „Zobraziť výsledok“ otvorí jediný spoločný modal bez GET.
- [ ] Výsledok obsahuje skutočné kontroly, korektné `response.ok`, neutrálny skipped, chybový infra timeout, Response Body a `ProviderTestResponse`.
- [ ] Source/Target rola z globálneho behu funguje aj po navigácii; AIRFLOW rolu nemá.
- [ ] Najviac 5 viditeľných notifikácií, čakajúce výsledky bez straty/expirácie; nový beh tej istej identity odstráni starú notifikáciu a kapacitný limit ticho nemaže cudzie výsledky.
- [ ] Focus, dialogStack, bezpečný auth session scope vrátane `unknown`/dev režimu, explicitný cleanup a EN/SK/CS sú overené; infra a platform CRUD bez regresie.
- [ ] Relevantné focused testy, lint, typecheck, locale parse a `git diff --check` prechádzajú; implementačný commit je atomický.

Vykonateľné checkboxy s rovnakými T1–T8 a C1–C6 sú v `tasks/platform-provider-airflow-connection-test-todo.md`.
