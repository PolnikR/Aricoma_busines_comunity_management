# Implementačný plán: Test pripojenia infraštruktúrneho providera

## Prehľad

Cieľom je doplniť do detail draweru infraštruktúrneho providera tlačidlo
`Test connection`. Tlačidlo bude umiestnené presne podľa schváleného UI variantu:
v pravom dolnom rohu hlavičky draweru, na rovnakom riadku ako badge typu
providera. Po aktivácii sa otvorí modal, ktorý zobrazí priebeh testu a po úspechu
základné údaje zistené z providera, napríklad názov, hostname, verziu a IP adresu.

V aktuálnom frontend kóde nie je nakonfigurovaný backend endpoint ani response
schema pre test providera. Implementácia preto začne potvrdením kontraktu a UI
nebude simulovaný úspech vydávať za reálny výsledok.

## Rozsah

- testovať existujúci uložený infraštruktúrny provider, nie rozpracovaný create/edit formulár;
- umiestniť `Test connection` do hlavičky existujúceho `DetailDrawer`;
- zachovať badge typu vľavo a testovacie tlačidlo vpravo na spoločnom riadku;
- zachovať `Delete` a `Edit` v pätičke draweru;
- po kliknutí spustiť jeden backend test pre presný `providerId`;
- zobraziť klientské preflight kroky, request stav, úspech alebo zlyhanie;
- po úspechu zobraziť provider metadata vrátené backendom;
- umožniť opakovanie neúspešného testu;
- doplniť EN/SK/CS texty a dostupné live statusy;
- overiť desktop aj úzky drawer bez horizontálneho overflow.

Mimo rozsahu je testovanie rozpracovaných neuložených providerov, hromadný test
viacerých providerov, ukladanie histórie testov, background monitoring,
automatický discovery run a zmena credential záznamov.

## Potvrdený UI dizajn

```text
┌──────────────────────────────────────────┐
│ Selected provider                    [×] │
│ Production vCenter Source                │
│ vmware-vcenter-01                        │
│                                          │
│ [VMware]              [Test connection] │
├──────────────────────────────────────────┤
│ Provider details                         │
├──────────────────────────────────────────┤
│ [Delete]                         [Edit]  │
└──────────────────────────────────────────┘
```

- Tlačidlo je textové, nie icon-only, pretože ide o významnú diagnostickú akciu.
- Použije existujúci `Button` s `size="sm"`, outline/soft variantom a ikonou
  pripojenia; nebude vizuálne súperiť s primárnymi create akciami stránky.
- Tlačidlo sa zobrazí iba pri konkrétnom selected providerovi.
- Provider s chýbajúcim alebo neplatným credentialom nebude testovaný. Tlačidlo
  bude disabled a poskytne čitateľný dôvod cez dostupný text/title.

## Produkčný behaviorálny dizajn

### Spustenie

1. Používateľ klikne na riadok providera a otvorí detail drawer.
2. Aktivuje `Test connection` v hlavičke.
3. Drawer sa počas testovacieho modalu skryje z accessibility tree, aby neboli
   súčasne aktívne dva `aria-modal` dialógy.
4. Modal sa otvorí a test sa spustí automaticky pre vybraný `providerId`.

### Kroky vo verzii 1

Frontend nebude používať falošné časovače. Zobrazí kroky, ktorých stav vie
pravdivo určiť:

1. `Validate provider configuration` — klient overí ID, endpoint/IP a typ.
2. `Validate credentials` — klient overí priradenie a dostupnosť credentialu.
3. `Connect to provider` — running počas backend requestu; výsledok podľa odpovede.
4. `Read provider information` — success iba keď odpoveď obsahuje validné metadata.

Ak backend v budúcnosti vráti vlastný zoradený zoznam krokov, API adaptér ho
namapuje do rovnakého UI modelu. Streaming/SSE/polling nie je súčasťou v1.

### Terminálne stavy

- **Success:** všetky vykonané kroky majú textový aj ikonový success stav a modal
  zobrazí `name`, `hostname`, `version`, `ipAddress` a voliteľný provider typ.
- **Connection failure:** označí sa konkrétny request krok, neskoršie kroky sú
  `skipped`; zobrazí sa bezpečný opis a `Retry`.
- **Invalid response:** spojenie mohlo prebehnúť, ale metadata krok zlyhá na schema
  validácii; raw payload sa používateľovi nezobrazí.
- **Close:** po zatvorení sa používateľ vráti k detailu toho istého providera.

## Navrhovaný frontend kontrakt

Interný UI model zostane stabilný bez ohľadu na presné backend názvy polí:

```ts
type ProviderConnectionTestStatus = 'success' | 'failed'
type ProviderConnectionStepStatus = 'success' | 'failed' | 'skipped'

interface ProviderConnectionTestStep {
  id: string
  label: string
  status: ProviderConnectionStepStatus
  detail?: string
  durationMs?: number
}

interface ProviderConnectionInfo {
  name: string
  hostname: string
  version: string
  ipAddress: string
  providerType?: string
}

interface ProviderConnectionTestResult {
  status: ProviderConnectionTestStatus
  steps?: ProviderConnectionTestStep[]
  providerInfo?: ProviderConnectionInfo
  message?: string
}
```

Odporúčaný backend request je jeden `POST`, ktorý prijme iba `provider_id`.
Credential ani heslo sa z browsera neposiela; backend použije credential uložený
pri providerovi. Konkrétna endpoint URL, request encoding a raw response názvy
polí musia byť potvrdené pred implementáciou API úlohy.

## Tok závislostí

```text
Potvrdený backend kontrakt
          │
          v
Endpoint config + Zod schema + API adapter
          │
          v
TanStack mutation hook
          │
          v
ProviderConnectionTestDialog
          │
          v
Header action v ProvidersCatalogueTable
          │
          v
Browser/API verifikácia
```

## Úlohy

### Úloha 1: Uzamknúť backend kontrakt a failing API testy

**Popis:** Pred produkčným kódom potvrdiť endpoint, HTTP metódu, umiestnenie
`provider_id`, success/failure statusy a raw metadata polia. Následne testami
definovať frontend request a validáciu response payloadu.

**Akceptačné kritériá:**

- [ ] Kontrakt jednoznačne určuje endpoint, request a success/failure odpoveď.
- [ ] Browser neposiela credential secret; odovzdáva iba identitu providera.
- [ ] Failing testy pokrývajú success, connection failure, nevalidné metadata a URL encoding ID.

**Verifikácia:**

- [ ] RED: API/schema testy zlyhajú, pretože endpoint a parser ešte neexistujú.
- [ ] Test fixtures neobsahujú heslá, tokeny ani privátne credential údaje.

**Závislosti:** Potvrdenie backend kontraktu.

**Pravdepodobne dotknuté súbory:**

- `src/config/apiEndpoints.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`
- `src/features/providers-connectors/providers/api/schemas/providerConnectionTestSchema.test.ts` (nový)

**Odhad rozsahu:** S (2–3 súbory).

### Úloha 2: Implementovať API adaptér a validačnú schému

**Popis:** Pridať endpoint config, Zod boundary parser a `testProviderConnection`
API funkciu. Raw backend odpoveď namapovať do stabilného camelCase UI modelu.

**Akceptačné kritériá:**

- [ ] Request používa `apiFetch`, teda zachová locked `X-User` header.
- [ ] Nevalidná alebo neúplná odpoveď skončí kontrolovanou chybou bez raw payloadu v UI.
- [ ] Normalizovaný výsledok nezávisí od raw názvov backend polí.

**Verifikácia:**

- [ ] GREEN: focused API/schema testy.
- [ ] `npm run typecheck`.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**

- `src/config/apiEndpoints.ts`
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/schemas/providerConnectionTestSchema.ts` (nový)
- `src/features/providers-connectors/providers/model/providerConnectionTestTypes.ts` (nový)
- súvisiace API/schema testy z Úlohy 1

**Odhad rozsahu:** S–M (4 produkčné súbory a focused testy).

### Úloha 2A: Vytvoriť mutation hook pre spustenie testu

**Popis:** Zapuzdriť API volanie do TanStack mutation hooku. Test spojenia nemení
provider dáta, preto hook nebude invalidovať provider list ani meniť jeho cache.

**Akceptačné kritériá:**

- [ ] Hook sprístupní idle, pending, success a error stav.
- [ ] Opakované kliknutie počas pending stavu nevytvorí paralelné requesty.
- [ ] Retry vytvorí nový request pre ten istý explicitný `providerId`.

**Verifikácia:**

- [ ] RED/GREEN hook test pre success, failure, retry a blokovanie dvojkliku.
- [ ] Test potvrdí, že provider-list cache sa neinvaliduje.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/features/providers-connectors/providers/hooks/useTestProviderConnection.ts` (nový)
- `src/features/providers-connectors/providers/hooks/useTestProviderConnection.test.tsx` (nový)

**Odhad rozsahu:** S (2 súbory).

## Checkpoint po úlohách 1–2A

- [ ] Backend kontrakt je potvrdený a nie je založený na domnienke.
- [ ] API boundary odmieta nevalidné response dáta.
- [ ] Žiadny credential secret neopustí backendovú hranicu.
- [ ] Focused API/hook testy a typecheck prejdú.

### Úloha 3: Vytvoriť test-first presentational connection-test dialog

**Popis:** Vytvoriť samostatný `ProviderConnectionTestDialog`, ktorý dostane
provider, request stav, normalizovaný výsledok a callbacky. Komponent nevykonáva
fetch. Zobrazí preflight, running, success, failed a retry stavy.

**Akceptačné kritériá:**

- [ ] Running krok používa `aria-live="polite"`/`role="status"` a text, nie iba spinner.
- [ ] Success zobrazuje name, hostname, version a IP v čitateľnom definition liste.
- [ ] Failure označí failed/skipped kroky ikonou aj textom a ponúkne `Retry`.

**Verifikácia:**

- [ ] RED/GREEN component test pre pending, success, error a retry.
- [ ] Test overí accessible názov dialógu a neprítomnosť raw error detailov.

**Závislosti:** Stabilný interný model z Úlohy 2; hook z Úlohy 2A sa pripája až
v integračnej Úlohe 5.

**Pravdepodobne dotknuté súbory:**

- `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.tsx` (nový)
- `src/features/providers-connectors/providers/components/ProviderConnectionTestDialog.test.tsx` (nový)

**Odhad rozsahu:** S (2 súbory).

### Úloha 4: Doplniť bezpečný focus lifecycle shared modalu

**Popis:** Existujúci shared `Modal` má `role="dialog"` a Escape handling, ale
nemá explicitné initial focus, focus trap ani restore focus. Doplniť tieto
správania test-first tak, aby connection-test modal a existujúce modaly spĺňali
klávesovú navigáciu bez zmeny ich verejného vzhľadu.

**Akceptačné kritériá:**

- [ ] Po otvorení je focus v modale a Tab/Shift+Tab neopustí dialóg.
- [ ] Escape rešpektuje close pravidlá a po zatvorení sa focus bezpečne obnoví.
- [ ] Existujúce `ConfirmDialog` a create/edit modal testy zostanú zelené.

**Verifikácia:**

- [ ] RED/GREEN focused `Modal` testy.
- [ ] Existujúce shared modal/provider modal testy.

**Závislosti:** Žiadne; vykonať pred integráciou dialógu.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/modal/Modal.tsx`
- `src/shared/components/modal/Modal.test.tsx` (nový alebo existujúci)

**Odhad rozsahu:** S (2 súbory).

## Checkpoint po úlohách 3–4

- [ ] Dialóg renderuje všetky terminálne stavy bez API závislosti.
- [ ] Modal je ovládateľný klávesnicou a focus sa nestratí mimo dialógu.
- [ ] UI nepoužíva falošné časovanie ani falošný success výsledok.

### Úloha 5: Zapracovať header action do detail draweru

**Popis:** Umožniť `headerExtra` využiť celú dostupnú šírku hlavičky a v
`ProvidersCatalogueTable` vykresliť spoločný riadok: type badge vľavo,
`Test connection` vpravo. Otvorenie testu dočasne deaktivuje/skryje drawer z
accessibility tree; zatvorenie modalu vráti používateľa k rovnakému providerovi.

**Akceptačné kritériá:**

- [ ] Tlačidlo je v pravom dolnom rohu hlavičky a Delete/Edit ostanú v pätičke.
- [ ] Tlačidlo testuje provider z aktuálne selected row, nie prvý provider v zozname.
- [ ] Chýbajúci credential deaktivuje tlačidlo s dostupným vysvetlením.

**Verifikácia:**

- [ ] RED/GREEN `ProvidersCatalogueTable` test pre umiestnenie a správny provider ID.
- [ ] Test overí disabled credential stav a jediný aktívny `aria-modal` dialóg.
- [ ] Existujúci Edit/Delete flow ostane zelený.

**Závislosti:** Úlohy 2, 2A, 3 a 4.

**Pravdepodobne dotknuté súbory:**

- `src/shared/components/data-table/DetailDrawer.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`

**Odhad rozsahu:** S (3 súbory).

### Úloha 6: Doplniť EN/SK/CS lokalizáciu

**Popis:** Pridať texty tlačidla, názvu modalu, štyroch klientských krokov,
running/success/failure/skipped stavov, metadata labelov, Retry/Close a disabled
dôvodu credentialu do všetkých podporovaných locales.

**Akceptačné kritériá:**

- [ ] EN/SK/CS majú identickú množinu nových kľúčov.
- [ ] Vizuálne texty sa nezalomujú problematicky pri 320 px.
- [ ] Status texty dávajú zmysel aj bez farieb a ikon.

**Verifikácia:**

- [ ] Locale key parity/JSON parse testy.
- [ ] Focused component test používa prekladové kľúče cez existujúci `t` flow.

**Závislosti:** Úloha 3.

**Pravdepodobne dotknuté súbory:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Odhad rozsahu:** S (3 mechanicky zhodné súbory).

## Checkpoint po úlohách 5–6

- [ ] Presné schválené umiestnenie tlačidla je implementované.
- [ ] Test target je vždy konkrétny selected provider.
- [ ] Drawer a modal nemajú konflikt focusu alebo dvoch aktívnych modalov.
- [ ] Edit/Delete flow a locale parity ostali bez regresie.

### Úloha 7: Produkčné browser a quality-gate overenie

**Popis:** Overiť úspešný aj neúspešný test v reálnom prehliadači, vrátane
requestu a responzívneho drawer layoutu. Následne spustiť celý projektový quality
gate a skontrolovať finálny diff.

**Akceptačné kritériá:**

- [ ] Browser odošle presný selected `provider_id` a žiadny credential secret.
- [ ] 320/768/1440 px zachová badge vľavo, Test vpravo alebo bezpečný wrap bez overflow.
- [ ] Success zobrazí backend metadata; failure ponúkne Retry a konzola je čistá.

**Verifikácia:**

- [ ] Focused provider API/hook/component testy.
- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] `npm test`.
- [ ] Vite production build.
- [ ] Browser: click, keyboard, focus trap, retry a network payload.

**Závislosti:** Úlohy 1–6.

**Pravdepodobne dotknuté súbory:** Žiadne ďalšie; iba opravy v uvedenom scope.

**Odhad rozsahu:** S plus čas celého test suite.

## Záverečný kontrolný bod

- [ ] Tlačidlo je na schválenom mieste v hlavičke draweru.
- [ ] Backend test je spustený iba pre konkrétny uložený provider.
- [ ] Kroky zobrazujú iba pravdivo známy stav, nie simulovaný priebeh.
- [ ] Success metadata pochádzajú z validovanej API odpovede.
- [ ] Error správy neodhaľujú raw backend ani credential detaily.
- [ ] Modal je prístupný z klávesnice a screen readerom.
- [ ] Edit, Delete, row selection a provider list zostali funkčné.
- [ ] Focused testy, celý suite, lint, typecheck, build a browser kontrola prešli.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---:|---|
| Backend endpoint/response ešte neexistuje | Vysoký | Úloha 1 je hard dependency; UI nepoužíva falošný runtime úspech. |
| UI predstiera interné backend kroky | Vysoký | V1 ukazuje iba klientské preflight a skutočný request/result stav. |
| Credential secret sa odošle z browsera | Vysoký | Request obsahuje iba provider ID; credential resolving vlastní backend. |
| Drawer a modal sú súčasne aktívne | Vysoký | Počas test modalu je drawer zatvorený/inert; integračný a a11y test. |
| Shared Modal zmena spôsobí regresiu | Stredný | Samostatná test-first úloha a focused testy existujúcich modalov. |
| Dlhý názov providera vytlačí tlačidlo | Stredný | Samostatný spodný header row s `justify-between` a kontrolovaným wrapom. |
| Raw chyba odhalí backend internals | Stredný | Normalizované používateľské správy; raw detail iba do budúcej observability vrstvy. |

## Paralelizácia

Po potvrdení kontraktu možno paralelne realizovať presentational dialog (Úloha 3),
shared Modal focus lifecycle (Úloha 4) a preklady (Úloha 6). API adaptér (Úloha 2),
mutation hook (Úloha 2A) a integrácia (Úloha 5) musia zostať sekvenčné kvôli
spoločnému kontraktu a stavu.

## Otvorený bod pred implementáciou

Backend musí potvrdiť endpoint URL, HTTP metódu, request encoding a raw response
polia. Plán odporúča jeden `POST` s `provider_id` a jednou finálnou odpoveďou.
Ak backend vyžaduje živé per-step udalosti, treba pred implementáciou rozšíriť
scope o polling, SSE alebo WebSocket kontrakt.
