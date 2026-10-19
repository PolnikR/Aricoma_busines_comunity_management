# Merania: Scroll tabuľky Resources

Dátum: 2026-10-16. Stav: T1, T2, schválené rozšírenie T2b a browser overenie T3 dokončené. Finálna matica: 105 PASS, 0 FAIL.

## Výsledok

Resources a Resources ISE používajú zmenšiteľný InventoryShell bez minima 480 px. Oblasť riadkov scrolluje v existujúcom DataTableSurface; nadpis, toolbar a stránkovanie nemenia pozíciu. Používateľ následne schválil zmenšenie odsadení Resources, aby zostal celý riadok dostupný aj pri 1280x600.

Voľba compactSpacing je v shared InventoryShell predvolene false a zapína ju iba ResourceInventoryShell. Od lg nastavuje medzery medzi metrikami/notice/kartou na 4 px, padding vonkajšej karty na 0, vertikálny padding inventory hlavičky na 2 px a padding obsahu na 0. Hustota riadkov a stav metrík sa nemenia. AppShell a ContainedViewportFrame nevyžadovali zmenu.

## Prostredie a opakovanie

Windows, Node 22.23.1, Playwright Core 1.64.1, headless Microsoft Edge, Vite na http://127.0.0.1:5177. Samostatný kontext pre každý prípad; autentifikácia je vypnutá iba zachytenou odpoveďou config.js v QA prehliadači. API je zachytené iba pre pathname začínajúce /api/. Žiadne produkčné dáta, tokeny alebo používateľský browser profil sa nepoužili.

Fixture: 232 VM/volumes/partitions, štyri source aj štyri target provider taby, 25 providerov na referenčnej Providers stránke. Základná hustota compact, 10 riadkov, metriky zbalené. Rozmery sú CSS px pri štandardnom zoome; zoom a skutočný backend používateľa sa nereprodukovali.

QA runtime je mimo projektových závislostí. Inštalácia po vymazaní node_modules:

```powershell
npm.cmd install --prefix node_modules/.cache/scroll-probe --no-package-lock --no-audit --no-fund playwright-core@1.64.1
npm.cmd run dev -- --host 127.0.0.1 --port 5177
# V druhom termináli:
node scripts/qa/verify-resources-table-scroll.mjs
node scripts/qa/verify-resources-table-scroll.mjs --matrix
```

Vyžaduje nainštalovaný Edge. QA_BROWSER vyberá dostupný Playwright channel; PLAYWRIGHT_MODULE určuje prípadnú inú cestu k playwright-core/index.mjs. QA_BASE_URL je obmedzené na localhost/127.0.0.1. QA_OUTPUT určuje priečinok artefaktov; QA_CASE je regulárny výraz pre opakovanie konkrétneho prípadu. Tieto nastavenia sú iba pre QA skript.

Finálna matica bola spustená s QA_OUTPUT=node_modules/.cache/resources-table-scroll/final. Priečinok obsahuje 105 screenshotov a results.json s geometriou. Ide o ignorované, dočasné artefakty. Základné merania sú zachované aj v tomto dokumente.

## Regresia a nameraná zmena

Pred základnou opravou skončil Playwright exit 1 pri 1366x768 aj 1280x600 na assertion Desktop route must not scroll outside the table. Component test tiež zlyhal na výškovom kontrakte. Základná oprava v d82d684e odstránila vonkajší scroll; rozšírená matica následne odhalila nedostatočnú výšku krátkeho okna.

Pred úpravou odsadení boli znovu potvrdené zlyhania Comfortable + rozbalené metriky (oblasť 40 px, hlavička 37 px, riadok 94.5 px) a cached-error (oblasť 0 px). Po úprave oba prípady prešli. Testy boli overené červené pred zmenou a zelené po nej.

| Prípad | Pretečenie route pred základnou opravou | Oblasť po základnej oprave | Finálna oblasť | Celé riadky finálne |
|---|---|---|---|---|
| VMware compact, 1366x768 | 106 px | 241 px | 333 px | 9 |
| VMware compact, 1280x600 | 274 px | 73 px | 165 px | 4 |
| VMware comfortable, 1280x600 | nemerané | 73 px | 165 px | 1 |
| VMware rozbalené metriky, 1280x600 | nemerané | 40 px | 132 px | 3 |
| VMware comfortable + rozbalené metriky, 1280x600 | nemerané | 40 px | 132 px | 1 |
| VMware cached-error, 1280x600 | nemerané | 0 px | 91 px | 1 |
| FlashSystem compact, 1280x600 | nemerané | 73 px | 165 px | 2 |
| IBM Power compact, 1280x600 | nemerané | 73 px | 165 px | 2 |

Finálne desktopové prípady nemajú vonkajší auto/scroll kontajner mimo tabuľky. Wheel posúva vnútorný kontajner; geometria nadpisu, toolbaru a stránkovania zostáva stabilná. Focus posledného riadku a následný Tab dosiahne stránkovanie bez scrollovania route. V prázdnom/chybovom stave sa overuje dosiahnuteľnosť príslušnej akcie vrátane vnútorného scrollovania, nie iba jej počiatočná poloha.

## Pokrytie finálnej matice

105 prípadov prešlo s exit 0:

- Šesť desktopových viewportov: 1366x768, 1280x600, 1204x777, 1507x795, 1505x971, 1884x994 pre VMware, FlashSystem, IBM Power, ich Resources ISE varianty a Providers.
- Pre všetkých šesť Resources flow navyše pageSize 25/50, Comfortable pri krátkej aj bežnej výške, rozbalené metriky pri oboch výškach, zbalený sidebar, Comfortable + rozbalené metriky pri 1280x600 a mobil 390x844.
- Prepnutie VMware tabu; loading, empty, error a cached-error pri 1280x600 aj 1280x971.
- Assertions overujú skutočný počet riadkov 10/25/50 a zachovanie zvoleného expanded stavu metrík. Žiadny prípad neprešiel s nulovým počtom celých riadkov, ak mal zobrazovať dáta.

Porovnanie s predchádzajúcimi meraniami potvrdilo rovnakú výšku oblasti tabuľky a pozíciu stránkovania pre všetkých šesť Providers viewportov aj všetkých šesť mobilných Resources variantov. Providers pri 1280x600 naďalej má 135 px a jeden celý riadok; pri 1366x768 má 303 px a štyri celé riadky. Mobil doscrolluje na stránkovanie a kliknutím otvorí druhú stránku.

Neboli zachytené pageerror udalosti. Simulované odpovede 503 v error prípadoch sú očakávané; nejde o tvrdenie o čistej sieťovej konzole pri úmyselne chybových odpovediach. Vizuálne skontrolované aj screenshoty 1366x768 a najtesnejšieho Comfortable + rozbalené metriky pri 1280x600.

## Cielené kontroly

```powershell
npm.cmd exec vitest run src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx src/features/discovery-inventory/resources/components/ResourceInventoryPanel.test.tsx src/shared/components/inventory-shell/InventoryShell.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx
npm.cmd exec eslint -- src/shared/components/inventory-shell/InventoryShell.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.tsx src/features/discovery-inventory/resources/components/ResourceInventoryShell.test.tsx
node --check scripts/qa/verify-resources-table-scroll.mjs
node scripts/qa/verify-resources-table-scroll.mjs --matrix
git diff --check
```

Výsledky: 4 Vitest súbory, 8 testov PASS; ESLint PASS; syntax QA skriptu PASS; finálna Playwright matica 105 PASS, 0 FAIL. Kontrola diffu prebehla pred commitom.

Celý test suite, plný typecheck ani produkčný build neboli spustené. Závery sa vzťahujú na uvedené fixture, viewporty a stavové kombinácie; ľubovoľne vysoký obsah, iný zoom alebo všetky súčasné kombinácie upozornení nie sú všeobecnou zárukou neobmedzeného priestoru.
