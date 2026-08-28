# Superseded: pôvodný plán Recovery Group resources scrollbaru

> Tento plán je neplatný. Implementácia podľa neho v commite `4346efe` nepriniesla
> zmenu reálneho browser layoutu. `lg:overflow-hidden` na page roote nevytvoril
> chýbajúci výškovo obmedzený flex kontajner. Korekčný plán pre Recovery Application
> aj Recovery Group je v `tasks/recovery-builder-scroll-containment-plan.md`.

# Pôvodný implementačný plán: obnovenie interného scrollbaru Recovery Group resources

## Prehľad

Obnoviť interný vertikálny scrollbar zoznamu dostupných zdrojov v kroku
**Resources** na obrazovkách vytvorenia aj editácie Recovery Group. Oprava musí zostať
lokálna pre full-height Recovery Group builder a nesmie vrátiť globálny problém
AppShellu, pri ktorom sa obsah tabuliek v nízkom okne zmenšil alebo stal
nedostupným.

Tento dokument je iba implementačný plán. Produkčný kód sa v tejto fáze nemení.

## Overený aktuálny stav a root cause

- `src/shared/components/resource-sidebar/ResourceSidebar.tsx` stále obsahuje
  internú scroll oblasť s `min-h-0 flex-1 overflow-y-auto`. Scrollbar teda nebol
  odstránený zo samotného sidebar komponentu.
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
  používa na desktopoch `lg:h-full` a očakáva výškovo obmedzeného rodiča.
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
  používa pre Resources krok `overflow-hidden`, aby scroll vlastnili vnorené panely.
- Create aj edit stránka majú koreň `flex min-h-full flex-col lg:h-full lg:min-h-0`,
  ale bez desktopového `overflow-hidden`.
- Commit `3eb0eba` zmenil `AppShell` na `lg:overflow-auto` a pridal Outlet wrapper
  s `lg:min-h-min`. Pri dlhom VM zozname sa preto min-content výška prenesie až do
  AppShellu: celý builder rastie podľa zoznamu a scrolluje hlavný obsah namiesto
  `ResourceSidebar`.
- Commit `8cad3b0` so skeletonmi scrollbar neodstránil; do scroll oblasti pridal iba
  `aria-busy`.

## Rozhodnutia a hranice

1. Oprava bude platiť pre create aj edit Recovery Group obrazovku, pretože obe
   používajú rovnaký builder a rovnaký výškový kontrakt.
2. Preferovaná oprava je pridať desktopové layout containment
   (`lg:overflow-hidden`) na koreň oboch stránok. Tým sa ich min-content príspevok
   uzavrie a vnorený `ResourceSidebar` znovu dostane obmedzenú výšku.
3. `AppShell`, globálny `lg:min-h-min`, `ResourceSidebar` ani
   `RecoveryGroupResourcesStep` sa nebudú meniť, pokiaľ live browser diagnostika
   nepotvrdí, že lokálny containment nestačí.
4. Mobilné správanie ostáva nezmenené: panely používajú pevnú `h-72` a stránka môže
   prirodzene scrollovať.
5. Ak browser nepotvrdí hypotézu po jednej minimálnej zmene, implementácia sa
   zastaví a vráti do diagnostiky. Nebude sa pridávať ďalší CSS workaround ani
   pevný viewportový `max-height`.

## Závislostný tok

```text
Browser baseline a computed styles
              │
              v
Failing layout contract testy
              │
              v
Lokálny containment create + edit stránok
              │
              v
Focused testy + desktop/mobile browser verification
              │
              v
Atomický commit
```

## Úloha 1: Potvrdiť regresiu v browseri a zaznamenať baseline

**Popis:** Reprodukovať problém na Resources kroku s dostatočne dlhým VMware
zoznamom a potvrdiť, že scroll vlastní AppShell `main`, zatiaľ čo vnorená sidebar
oblasť nemá overflow.

**Akceptačné kritériá:**

- [ ] Na desktop viewport-e je reprodukovaný chýbajúci interný scrollbar.
- [ ] Je potvrdené, že `ResourceSidebar` má computed `overflow-y: auto`, ale jeho
  `scrollHeight` neprevyšuje `clientHeight`, pretože rodič narástol podľa obsahu.
- [ ] Je potvrdené, že AppShell `main` alebo jeho Outlet wrapper má overflow a
  scrolluje namiesto sidebaru.

**Verification:**

- [ ] Screenshot pred opravou.
- [ ] Read-only DevTools záznam `clientHeight`, `scrollHeight`, computed `height`,
  `min-height` a `overflow-y` pre AppShell `main`, Outlet wrapper, Recovery Group
  page root, builder content, sidebar wrapper a sidebar scroll oblasť.
- [ ] Konzola skontrolovaná na nesúvisiace runtime chyby, ktoré by mohli meniť DOM.

**Závislosti:** žiadne

**Súbory pravdepodobne dotknuté:** žiadne

**Odhad:** XS

## Úloha 2: Pridať regresné testy layout kontraktu

**Popis:** Pred opravou doplniť testy, ktoré vyžadujú desktopové containment na
create aj edit stránke. Testy majú chrániť spojenie medzi AppShell min-content
správaním a full-height builderom bez predstierania, že jsdom vie merať reálny CSS
layout.

**Akceptačné kritériá:**

- [ ] Test create stránky nájde jej page root a očakáva `lg:overflow-hidden` spolu
  s existujúcimi `lg:h-full` a `lg:min-h-0`.
- [ ] Rovnaký kontrakt je pokrytý pre edit stránku.
- [ ] Testy pred produkčnou zmenou zlyhajú na chýbajúcom containment a nemenia
  existujúce behavior assertions.

**Verification:**

- [ ] Spustiť:
  `npm exec vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`
- [ ] Zaznamenať očakávaný red stav iba v nových layout assertions.

**Závislosti:** Úloha 1

**Súbory pravdepodobne dotknuté:**

- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Odhad:** S

## Úloha 3: Obnoviť lokálny full-height containment

**Popis:** Pridať `lg:overflow-hidden` na koreň create a edit stránky. Nemeníť
vnorené komponenty ani globálny AppShell.

**Akceptačné kritériá:**

- [ ] Create Recovery Group page má na desktopoch uzavretý výškový kontext.
- [ ] Edit Recovery Group page má rovnaký layout kontrakt.
- [ ] Mobilné triedy a error/not-found vetvy zostanú nezmenené.

**Verification:**

- [ ] Nové layout testy prejdú do green stavu.
- [ ] Existujúce create/edit behavior testy zostanú zelené.
- [ ] Diff obsahuje iba dve page-root CSS triedy a priamo súvisiace testy.

**Závislosti:** Úloha 2

**Súbory pravdepodobne dotknuté:**

- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`

**Odhad:** S

## Checkpoint: Po úlohách 1–3

- [ ] Root-cause hypotéza je potvrdená browserom, nie iba čítaním Tailwind tried.
- [ ] Create aj edit focused testy prešli.
- [ ] `AppShell.tsx`, `ResourceSidebar.tsx`, `RecoveryGroupBuilder.tsx` a
  `RecoveryGroupResourcesStep.tsx` nemajú produkčný diff.
- [ ] Review diffu potvrdil, že nevznikol pevný pixelový alebo viewportový výškový
  workaround.

## Úloha 4: Overiť reálne scroll správanie a responzivitu

**Popis:** V tom istom browser flow overiť, že interný scrollbar je po oprave
funkčný a globálne short-window správanie zostalo zachované.

**Akceptačné kritériá:**

- [ ] Na create Resources kroku má sidebar `scrollHeight > clientHeight` a interné
  rolovanie sprístupní poslednú VM bez posunu celého wizardu.
- [ ] Rovnaké správanie je potvrdené na edit Resources kroku.
- [ ] Pri krátkom desktop viewport-e zostanú header, wizard navigácia a actions
  dostupné; AppShell globálna oprava tabuliek sa nerevertovala.
- [ ] Na mobilnej šírke ostane prirodzený page scroll a oba panely majú očakávanú
  výšku.

**Verification:**

- [ ] Screenshot create stránky po oprave.
- [ ] Screenshot edit stránky po oprave.
- [ ] Desktop viewport s dlhým zoznamom, krátky desktop viewport a mobilný viewport.
- [ ] Read-only DevTools kontrola computed výšok a overflow vlastníka.
- [ ] Konzola bez nových errorov alebo warningov.

**Závislosti:** Úloha 3

**Súbory pravdepodobne dotknuté:** žiadne; iba ak test odhalí priamo súvisiacu
regresiu

**Odhad:** S

## Úloha 5: Finálna focused verification a atomický commit

**Popis:** Overiť iba dotknutý scope a commitnúť opravu ako jednu izolovanú zmenu.

**Akceptačné kritériá:**

- [ ] Všetky focused kontroly skončia exit kódom 0.
- [ ] Stage obsahuje iba create/edit page root zmenu a ich testy.
- [ ] Oprava je v jednom popisnom commite.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`
- [ ] `npm exec eslint src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx --max-warnings 0`
- [ ] `npm run typecheck`
- [ ] `git diff --check`
- [ ] Commit napríklad `fix: restore recovery resource list scrolling`.
- [ ] Plný test suite a produkčný build sa štandardne nespúšťajú, pretože ide o
  izolovanú štvorsúborovú CSS/test zmenu; spustia sa iba ak focused kontroly odhalia
  širší dopad.

**Závislosti:** Úloha 4

**Súbory pravdepodobne dotknuté:** žiadne ďalšie

**Odhad:** S

## Riziká a mitigácie

| Riziko | Dopad | Mitigácia |
|---|---|---|
| `lg:overflow-hidden` iba skryje obsah bez obnovenia interného scrollu | vysoký | Pred a po zmene merať `clientHeight`/`scrollHeight`; pri nepotvrdení zastaviť a vrátiť sa do diagnostiky. |
| Oprava create stránky nepokryje edit stránku | stredný | Rovnaká produkčná trieda, samostatný test a browser check pre obe routes. |
| Globálny AppShell short-window fix sa omylom revertuje | vysoký | `AppShell.tsx` je explicitne mimo scope a kontroluje sa nulový diff. |
| Mobilná stránka prestane prirodzene scrollovať | stredný | Trieda je iba `lg:` a mobilný viewport je súčasťou browser verification. |
| jsdom test dá falošnú istotu o CSS layoute | stredný | Unit test chráni iba class contract; skutočné správanie musí potvrdiť browser. |

## Finálne acceptance criteria

- Interný scrollbar dostupných zdrojov je viditeľný a funkčný pri dlhom zozname na
  create aj edit Recovery Group Resources kroku.
- Scrollovanie zoznamu neposúva celý wizard a posledná položka je dostupná.
- Selected resources panel ostáva výškovo zarovnaný s available resources panelom.
- Desktopový AppShell a jeho globálne short-window správanie ostávajú nezmenené.
- Mobilné prirodzené page scrollovanie ostáva nezmenené.
- Oprava nezasahuje dátové fetchovanie, loading skeletony, drag-and-drop ani
  ResourceSidebar API.
- Focused testy, focused lint, typecheck, browser verification a diff check prejdú.
- Zmena je commitnutá atomicky bez nesúvisiacich súborov.

## Odhad náročnosti

**Nízka, približne 2–4 hodiny**, vrátane reprodukcie, TDD, browser overenia create/edit
a kontroly krátkeho a mobilného viewportu. Samotná produkčná oprava by mala byť
dvojriadková; väčšina práce je dôkaz, že sa neopraví jeden layout za cenu regresie
iného.
