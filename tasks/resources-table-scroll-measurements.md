# Merania: Scroll tabuľky Resources

Dátum: 2026-10-16. Stav: základná oprava T1/T2 overená; T3 a finálny kontrolný bod zostávajú otvorené pre použiteľnosť krátkeho okna.

## Prostredie a opakovanie

Windows, Node 22.23.1, Playwright Core 1.64.1, headless Microsoft Edge, Vite na http://127.0.0.1:5177. Samostatný kontext pre každý prípad; autentifikácia je vypnutá iba zachytenou odpoveďou config.js v QA prehliadači. API je zachytené iba pre pathname začínajúce /api/. Žiadne produkčné dáta, tokeny alebo používateľský browser profil sa nepoužili.

Fixture: 232 VM/volumes/partitions, štyri source aj štyri target provider taby, 25 providerov na referenčnej Providers stránke. Základná hustota compact, 10 riadkov, metriky zbalené. Rozmery sú CSS px pri štandardnom zoome, nie fyzické rozmery screenshotu.

QA runtime je mimo projektových závislostí. Inštalácia po vymazaní node_modules:

```powershell
npm.cmd install --prefix node_modules/.cache/scroll-probe --no-package-lock --no-audit --no-fund playwright-core@1.64.1
npm.cmd run dev -- --host 127.0.0.1 --port 5177
# V druhom termináli:
node scripts/qa/verify-resources-table-scroll.mjs
node scripts/qa/verify-resources-table-scroll.mjs --matrix
```

Vyžaduje nainštalovaný Edge. QA_BROWSER vyberá dostupný Playwright channel; PLAYWRIGHT_MODULE môže určiť absolútnu alebo pracovnú relatívnu cestu k inému playwright-core/index.mjs. QA_BASE_URL je iba localhost/127.0.0.1. QA_OUTPUT určuje priečinok artefaktov; QA_CASE je regulárny výraz pre opakovanie konkrétneho prípadu. Tieto nastavenia sú iba pre QA skript, nie pre aplikáciu.

Screenshoty a kompletná geometria sú v ignorovanom node_modules/.cache/resources-table-scroll/. Základná regresia je v podpriečinku regression/, zopakované stavové scenáre v states/. Nie sú commitnuté. Tento súbor zachováva podstatné výsledky aj po odstránení dočasného runtime.

## T1: Potvrdená regresia pred opravou

Browser skript skončil exit 1 pri oboch základných viewportoch na assertion Desktop route must not scroll outside the table. Komponentový test pred opravou takisto zlyhal, pretože karta mala lg:min-h-[480px] namiesto zmenšiteľného layoutu.

| Okno | Pretečenie route pred opravou | Pretečenie po oprave | Výška oblasti tabuľky po oprave | Celé viditeľné riadky po oprave |
|---|---|---|---|---|
| 1366x768 | 106 px | 0 px | 241 px | 6 |
| 1280x600 | 274 px | 0 px | 73 px | 1 |

Po oprave koliesko posúva vnútorný kontajner, nadpis, toolbar a stránkovanie nemenia pozíciu. Focus posledného riadku a následný Tab dosiahne stránkovanie bez scrollovania route. Nebol potrebný zásah do ContainedViewportFrame, AppShell ani shared InventoryShell.

## T3: Rozšírená matica

Spustených 99 prípadov: šesť desktopových veľkostí pre VMware, FlashSystem, IBM Power, ich Resources ISE varianty a Providers; pre šesť Resources variantov navyše pageSize 25/50, comfortable, rozbalené metriky, zbalený sidebar a mobil 390x844. Pridané prepnutie VMware tabu a osem stavových prípadov loading/empty/error/cached-error pri 1280x600 a 1280x971.

Prvý beh: 77 PASS, 22 FAIL. Jeden FAIL bol príliš prísna kontrola prázdneho stavu: vyžadovala viditeľnosť Clear filters ešte pred vnútorným scrollovaním. Upravená na požadovanú dosiahnuteľnosť cez scrollIntoViewIfNeeded a trial click, so stabilným nadpisom a bez overflow route. Zopakovaných všetkých osem stavových prípadov: 7 PASS, 1 FAIL (cached-error pri 600 px). Nešlo o zmenu produkčného kódu alebo oslabenie kontroly scrollovania riadkov.

Zostáva 21 prípadov s nedostatočnou výškou riadkov. Rozšírená matica preto nie je zelená a plán sa neoznačuje za dokončený. Žiadny z nameraných Resources prípadov po oprave nevyžadoval vonkajší auto/scroll kontajner; zlyhania sú v použiteľnosti zostávajúcej oblasti, nie v pôvodnom vlastníkovi scrollu.

### Hranica 1280x600

| Variant | Oblasť tabuľky | Hlavička | Výška riadku | Celé riadky |
|---|---|---|---|---|
| VMware compact, zbalené metriky | 73 px | 37 px | 31 px | 1 |
| VMware comfortable, zbalené metriky | 73 px | 37 px | 94.5 px | 0 |
| VMware compact, rozbalené metriky | 40 px | 37 px | 31 px | 0 |
| FlashSystem compact, zbalené metriky | 73 px | 37 px | 47.5 px | 0 |
| FlashSystem comfortable, zbalené metriky | 73 px | 37 px | 55.5 px | 0 |
| IBM Power compact, zbalené metriky | 73 px | 37 px | 49 px | 0 |
| IBM Power comfortable, zbalené metriky | 73 px | 37 px | 57 px | 0 |
| VMware cached-error | 0 px | 37 px | 31 px | 0 |
| Providers referencia | 135 px | 37 px | 57 px | 1 |

Rovnaké krátke limity majú aj príslušné ISE varianty. Rozbalené metriky vo FlashSystem/IBM Power ponechali oblasť 40 px. Zbalený sidebar sám tento nedostatok výšky neodstránil.

Ostatné desktopové rozmery 1366x768, 1204x777, 1507x795, 1505x971 a 1884x994 prešli pri štandardnom compact zobrazení všetkých šiestich Resources flow. PageSize 25/50, comfortable a rozbalené metriky pri bežnej výške prešli. Šesť mobilných variantov umožnilo doscrollovať a kliknúť na ďalšiu stránku. Providers prešiel všetkými šiestimi veľkosťami. Neboli zachytené pageerror udalosti. Simulované 503 v error prípadoch sú očakávané a nie sú tvrdením o čistej sieťovej konzole.

## Návrh ďalšej malej úpravy

Zmenšiť iba na Resources vertikálne odsadenia vonkajšej karty, inventory hlavičky a medzery pri metrikách. Zachovať hustotu riadkov aj uloženú voľbu metrík; nepridávať automatické zbaľovanie. Neprenášať túto zmenu na Providers bez samostatného dôvodu.

Dočasný DOM pokus (nie zdrojová implementácia): karta padding 0, inventory hlavička padding-top/bottom 4 px a medzera pri metrikách 8 px. Pri 1280x600 získal VMware comfortable 133 px (1 celý riadok) a compact s rozbalenými metrikami 100 px (2 celé riadky). Tento pokus zatiaľ nedokazuje riešenie cached-error alebo kombinácie comfortable + rozbalené metriky; tie treba zahrnúť do následnej verifikácie. O rozšírenie scope bola položená samostatná otázka používateľovi, odpoveď zatiaľ neprišla.

## Vykonané kontroly

- npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx: 4 súbory, 8 testov PASS.
- npm.cmd exec eslint -- src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx: PASS.
- node --check scripts/qa/verify-resources-table-scroll.mjs: PASS.
- node scripts/qa/verify-resources-table-scroll.mjs: základné dve regresie PASS po oprave; pred opravou obe FAIL.
- node scripts/qa/verify-resources-table-scroll.mjs --matrix: otvorené zlyhania použiteľnosti uvedené vyššie.
- QA_CASE=^vmware-(loading|empty|error|cached-error)- a rovnaký --matrix príkaz: 7 PASS, 1 FAIL, nameraných 0 px pre cached-error pri 600 px.
- git diff --check: PASS.

Celý test suite, plný typecheck ani produkčný build neboli spustené. T3 a finálne odovzdanie celej opravy zostávajú otvorené; overená základná oprava je samostatný inkrement.
