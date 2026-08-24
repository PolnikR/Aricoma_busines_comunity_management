# Implementačný plán: spoločný URL pagination pattern pre resource inventory

## Prehľad

Cieľom je zjednotiť stav stránkovania, vyhľadávania a stabilných filtrov pre
VMware, FlashSystem a IBM Power. URL bude jediný zdroj pravdy pre stav tabuľky,
zatiaľ čo existujúce API bude naďalej vracať celý inventory dataset. Návrh
vytvorí stabilnú hranicu, cez ktorú sa po potvrdení backend kontraktu zapojí
server-side pagination bez prepisovania tabuliek.

Schválený návrh je v
`docs/superpowers/specs/2026-08-10-resource-inventory-url-pagination-design.md`.

## Architektonické rozhodnutia

- `useResourceTabSearchParam` ostáva vlastníkom `resource` a `providerId`.
- Nový shared URL-state základ bude vlastniť `page`, `pageSize`, `search` a
  atomické zmeny search parametrov.
- Tenké resource-specific hooky budú definovať iba vlastné filtre a ich
  serializáciu.
- Provider nebude súčasťou filter badge ani lokálneho filter state.
- Povolené page sizes budú spoločné: `10`, `25`, `50`; fallback bude `10`.
- URL update zapíše normalizované `page` a `pageSize` explicitne; `resource`
  ostane vynechaný iba pre defaultný VMware view kvôli spätnej kompatibilite.
- Zmena `pageSize`, search alebo filtra resetuje `page=1`.
- Zmena resource/providera zachová `pageSize` a univerzálny search, resetuje
  page a odstráni filtre neplatné pre nový zdroj.
- URL aktualizácie použijú `replace`, aby pagination a live search nevytvárali
  desiatky položiek v browser history.
- API klienti v tejto etape nedostanú nepotvrdené pagination parametre.
- Budúca mapovacia vrstva preloží frontend `page/pageSize` na potvrdený backend
  kontrakt; tabuľky sa pri tom nebudú meniť.

## Závislosti a poradie

```text
URL codec + shared hook
          |
          v
VMware compatibility migration
          |
          +--------------------+
          v                    v
FlashSystem URL state     IBM Power URL state
          \                    /
           +------------------+
                    v
Source/provider canonicalization
                    v
Regression and browser verification

Future backend contract
          |
          v
API adapter + paginated response mapping (deferred)
```

## Úloha 1: Definovať spoločný URL pagination kontrakt testami

**Popis:** Najprv vytvoriť failing testy pre parsovanie a aktualizáciu spoločných
parametrov. Testy budú používať router harness a nebudú závisieť od konkrétneho
inventory typu.

**Akceptačné kritériá:**

- [ ] Chýbajúce alebo neplatné `page`/`pageSize` sa normalizujú na `1`/`10`.
- [ ] Povolené hodnoty `10`, `25`, `50` sa zachovajú a page-only update nemení
      ostatné parametre.
- [ ] Zmena search, filtra alebo page size zapíše `page=1` atomicky.
- [ ] Každá URL mutácia zapíše explicitné normalizované `page` a `pageSize`.

**Overenie:**

- [ ] RED test pre nový shared hook/codec.
- [ ] Test overí array, boolean, string a prázdne hodnoty používané VMware
      filtrami.

**Závislosti:** Žiadne.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useResourceInventorySearchParams.test.tsx`
- `src/features/discovery-inventory/resources/model/resourceInventoryQuery.ts`

**Odhad rozsahu:** S (2 súbory).

## Úloha 2: Implementovať shared URL-state základ

**Popis:** Implementovať validované parsovanie, serializáciu a immutable update
URL parametrov. Verejné rozhranie oddelí spoločnú pagination časť od
resource-specific filter hodnôt.

**Akceptačné kritériá:**

- [ ] Hook vracia normalizované `page`, `pageSize`, `search` a resource filtre.
- [ ] Update zachová `resource`, `providerId` a neovplyvnené kompatibilné
      parametre.
- [ ] Komponenty nemusia pracovať priamo s `URLSearchParams`.

**Overenie:**

- [ ] GREEN focused test z úlohy 1.
- [ ] `npm run typecheck`.

**Závislosti:** Úloha 1.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useResourceInventorySearchParams.ts`
- `src/features/discovery-inventory/resources/model/resourceInventoryQuery.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceInventorySearchParams.test.tsx`

**Odhad rozsahu:** M (3 súbory).

## Kontrolný bod po úlohách 1–2

- [ ] Shared URL kontrakt má samostatné testy pre validné aj nevalidné vstupy.
- [ ] Žiadna resource page ešte nemení správanie.
- [ ] Focused testy a typecheck prejdú.

## Úloha 3: Migrovať VMware na shared URL-state základ

**Popis:** Zachovať existujúce URL správanie VMware cez tenký
resource-specific wrapper nad shared hookom bez súčasnej zmeny jeho filter UI.

**Akceptačné kritériá:**

- [ ] VMware page, page size, search a filtre sa správajú rovnako ako pred
      migráciou.
- [ ] Zníženie počtu výsledkov zapíše clampnutú stránku späť do URL.
- [ ] Existujúce VMware URL zostanú spätne kompatibilné.

**Overenie:**

- [ ] Existujúce a doplnené `useVirtualMachineSearchParams` testy prejdú.
- [ ] Focused `VmwareResourcesPage` a toolbar testy prejdú.

**Závislosti:** Úloha 2.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`

**Odhad rozsahu:** M (3 súbory).

## Úloha 4: Oddeliť VMware provider context od filtrov

**Popis:** Odstrániť `providerId` z VMware table-filter modelu a všetkých reset,
toolbar a test fixture ciest. Provider ostane súčasťou resource selection a API
query, ale nebude predstierať používateľský filter.

**Akceptačné kritériá:**

- [ ] VMware filtre ani ich callbacky neobsahujú `providerId`.
- [ ] API query vždy používa provider z aktívneho source tabu.
- [ ] Clear filters, tags a page reset nemenia aktívny provider.

**Overenie:**

- [ ] Focused toolbar, filter helper a VMware page testy prejdú.
- [ ] Typecheck zachytí každý zostávajúci filter callback s providerom.

**Závislosti:** Úloha 3.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/types.ts`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VirtualMachinesToolbar.test.tsx`
- `src/features/discovery-inventory/resources/helpers/filterVirtualMachines.test.ts`

**Odhad rozsahu:** M (4 súbory).

## Úloha 5: Zapnúť URL pagination a filtre pre FlashSystem

**Popis:** Nahradiť lokálny page, page-size a filter state URL-backed hookom.
Existujúce client-side filtrovanie a slicing ostanú funkčne rovnaké.

**Akceptačné kritériá:**

- [ ] `page`, `pageSize`, `search`, `poolId`, `hostId` a `status` sa obnovia po
      refreshi.
- [ ] Zmena page size alebo filtra resetuje page na 1; out-of-range page sa
      clampne a URL opraví.
- [ ] Reset filtrov zachová aktívny provider a zatvorí neplatný detail výber.

**Overenie:**

- [ ] Focused hook a `FlashSystemInventoryView` testy prejdú.
- [ ] Router test dokáže obnoviť stránku a filtre z URL.

**Závislosti:** Úlohy 2–4.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/useFlashSystemSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`

**Odhad rozsahu:** M (4 súbory).

## Kontrolný bod po úlohách 3–5

- [ ] VMware a FlashSystem používajú rovnaký pagination základ.
- [ ] Refresh a skopírovaná URL obnovia rovnakú stránku a filtre.
- [ ] Provider zostáva navigation context, nie filter.

## Úloha 6: Zapnúť URL pagination a filtre pre IBM Power

**Popis:** Nahradiť lokálny IBM Power page, page-size a filter state rovnakým
shared URL patternom a zachovať client-side transformácie.

**Akceptačné kritériá:**

- [ ] `page`, `pageSize`, `search`, `partitionKind`, `partitionState`,
      `operatingSystemType` a `volumeState` sa obnovia po refreshi.
- [ ] Filter/page-size zmena resetuje page; page clamping opraví URL.
- [ ] Reset filtrov zachová aktívny provider a zatvorí neplatný detail výber.

**Overenie:**

- [ ] Focused hook a `PowerInventoryView` testy prejdú.
- [ ] Router test dokáže obnoviť stránku a filtre z URL.

**Závislosti:** Úlohy 2–4.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.ts`
- `src/features/discovery-inventory/resources/hooks/usePowerSearchParams.test.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.tsx`
- `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx`

**Odhad rozsahu:** M (4 súbory).

## Úloha 7: Kanonizovať source/provider prechody

**Popis:** Rozšíriť resource selection update tak, aby pri prepnutí typu alebo
providera resetoval page, zachoval spoločný search/pageSize a odstránil filtre,
ktoré pre nový zdroj alebo provider nemusia byť platné.

**Akceptačné kritériá:**

- [ ] Prepnutie resource/providera zapíše novú selection a `page=1` jednou URL
      aktualizáciou.
- [ ] `pageSize` a spoločný `search` zostanú zachované.
- [ ] VMware, FlashSystem a IBM Power špecifické filtre sa medzi zdrojmi
      neprenášajú; provider-dependent filtre sa vyčistia aj pri zmene providera.

**Overenie:**

- [ ] `useResourceTabSearchParam` testy pokryjú každý resource typ aj zmenu
      providera v rovnakom type.
- [ ] `ResourcesPage` integračný test overí výslednú URL.

**Závislosti:** Úlohy 5–6.

**Pravdepodobne dotknuté súbory:**

- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.ts`
- `src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`

**Odhad rozsahu:** M (3 súbory).

## Kontrolný bod po úlohách 6–7

- [ ] Všetky tri inventory typy majú identický pagination lifecycle.
- [ ] Medzi source/provider tabmi neostávajú neplatné filtre.
- [ ] Focused resource testy a typecheck prejdú.

## Úloha 8: Overiť produkčný frontend flow

**Popis:** Overiť refresh, zdieľanie URL, pagination ovládanie a regresie v
reálnom browseri aj automatizovaných quality gates.

**Akceptačné kritériá:**

- [ ] Každý tab obnoví z URL resource, provider, page, page size, search a svoje
      filtre.
- [ ] Pagination a filtre nemenia API kontrakt; requesty stále posielajú iba
      dnes podporované parametre.
- [ ] V UI nevznikne druhý provider selector ani nový layout regression.

**Overenie:**

- [ ] Focused URL/resource testy prejdú.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- [ ] Browser kontrola VMware, FlashSystem a IBM Power: page 2, refresh, zmena
      page size, filter reset a source/provider switch.
- [ ] `git diff --check`.

**Závislosti:** Úlohy 3–7.

**Pravdepodobne dotknuté súbory:** Žiadne okrem regresných opráv v uvedenom
scope.

**Odhad rozsahu:** S.

## Záverečný kontrolný bod

- [ ] Všetky tri resource taby používajú spoločný URL pagination pattern.
- [ ] Provider selection má jediného vlastníka v top-level source navigácii.
- [ ] URL state sa obnovuje po refreshi a je bezpečný pre neplatné hodnoty.
- [ ] Súčasný nepaginated backend ostáva kompatibilný.
- [ ] Budúca server-side pagination nevyžaduje zmenu table komponentov.
- [ ] Testy, lint, typecheck, build a browser smoke test sú úspešné.
- [ ] Používateľ schválil plán pred implementáciou.

## Budúca backend etapa — nezačínať bez potvrdeného kontraktu

Po potvrdení backend API vznikne samostatný plán, ktorý:

1. definuje request/response schémy a mapovanie `page/pageSize` na backend;
2. pridá serverové filtre, sort a pagination parametre do query keys;
3. nahradí client-side slicing stránkovanou response;
4. zabezpečí globálne metriky cez response summary alebo metrics endpoint;
5. zachová predchádzajúcu stránku počas background fetch a ošetrí out-of-range
   odpoveď.

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Dva hooky prepíšu navzájom search parametre | Vysoký | Každý update vychádza z aktuálnych `URLSearchParams`, mení iba vlastnené kľúče a má integračné testy atomických prechodov. |
| Filter zo starého providera skryje všetky dáta nového | Vysoký | Pri zmene provider/resource odstrániť source/provider-dependent filtre a resetovať page. |
| Rozdielne default page sizes ostanú nekonzistentné | Stredný | Zaviesť spoločné hodnoty `10/25/50` a fallback `10`. |
| Backend pagination neskôr rozbije metriky | Vysoký | V návrhu vyžadovať agregovaný summary/metrics endpoint; nepočítať globálne metriky z jednej stránky. |
| Klient filtruje iba jednu serverovú stránku | Vysoký | Pri backend migrácii presunúť search/filter/sort spolu s pagination, nie samostatne. |
| URL z predchádzajúcej verzie prestane fungovať | Stredný | Parser akceptuje chýbajúce parametre a používa bezpečné defaults. |
| Full test suite opäť prekročí lokálny timeout | Stredný | Povinné focused testy po každej fáze; celý suite spustiť s dostatočným limitom a timeout transparentne zaznamenať. |

## Otvorené otázky

- Názvy backend request parametrov a shape pagination response sa rozhodnú až
  po zverejnení backend kontraktu. Frontend plán od nich nie je závislý.
- Ak backend zvolí cursor pagination, vznikne samostatné rozhodnutie, či URL
  zachová page-based UX alebo prejde na cursor tokeny.
