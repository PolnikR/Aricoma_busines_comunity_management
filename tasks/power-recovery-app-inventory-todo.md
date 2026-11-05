# TODO: IBM Power Recovery Application Inventory

Stav: implementácia schválená používateľom 2026-11-05; prebieha inline. Úlohy 1–7 sú implementované a overené; potvrdenie cieľového BE pred nasadením zostáva otvorené. Podrobné súbory, akceptácia a príkazy sú v [pláne](power-recovery-app-inventory-plan.md).

## Fáza 0 — pred implementáciou

- [x] Používateľ schválil implementáciu.
- [x] Znovu preveriť Git stav a zachovať všetkých osem OpenAPI/Orval vstupných zmien vrátane troch nových súborov.
- [x] Nevykonávať manuálne úpravy generated súborov, BE ani nový API hook.

## Fáza 1 — VMware baseline a preklady

- [x] Úloha 1 (M, bez závislostí): oddeliť VMware JSX do `RecoveryApplicationVmwareInventory.tsx`; spoločný GET a obal ponechať.
- [x] Pôvodné VMware, JSON a cache/retry testy prejdú; fixtures zahŕňajú reálne Zod defaulty.
- [x] Úloha 2 (M, závisí od 1): pripraviť SK/EN/CS kľúče pre summary, ownership, LPAR, adaptéry, hosty, volumes, FlashCopy a warnings.
- [x] Pridať test parity kľúčov/placeholderov a validovať JSON. `powerUnsupported` zatiaľ ponechať do zapojenia Power vetvy.

### Kontrolný bod 1

- [x] VMware zobrazenie nezmenené; preklady pripravené a overené cielenými testami.

## Fáza 2 — Power request a LPAR

- [x] Úloha 3 (M, závisí od 1–2): odstrániť `!isPower` gate; target resolver zdieľaný pre obe platformy, bez fallbackov.
- [x] Overiť skutočný GET s target ID pre oba casingy platformy; inactive/no-run/missing-target bez fetchu.
- [x] Dispatch podľa response platform, legacy VMware default a bezpečné zobrazenie neznámej platformy.
- [x] Pridať `RecoveryApplicationPowerInventory.tsx` a jeho test; summary a tiers/LPAR zobrazenie.
- [x] Pokryť run/foreign/unattached/unknown, null LPAR a run + other_hosts bez straty detailu alebo warningu.
- [x] Odstrániť zastarané použitie aj tri preklady `powerUnsupported` a nahradiť blokovací test.
- [x] Úloha 4 (S, závisí od 3): doplniť UUID/state/RMC/managed system, vFC a Ethernet podľa overených BE kľúčov.
- [x] Overiť null/absent/[]/neplatné record typy a nuly; zachovať technický JSON a kopírovateľné identifikátory.

### Kontrolný bod 2

- [x] Power GET → LPAR UI funguje; found nie je zamieňané s existenciou a co-holding warning je viditeľný aj pri zbalení.
- [x] Prešli oba inventory testy a cielený ESLint dotknutých súborov.

## Fáza 3 — hosty, volumes a čiastočné výsledky

- [x] Úloha 5 (S, závisí od 4): samostatná recovered_hosts sekcia vrátane hostov bez LPAR.
- [x] Hostname/storage provider/active ports/WWPN a volumes; žiadny filter podľa found.
- [x] Vdisk ID/meno, SCSI 0, boot flag, capacity bytes, pool a FlashCopy map/source/CG; nuly neprepísať placeholderom.
- [x] Host ostane viditeľný aj pri nedostupných detailoch, prázdnych volumes a warnings; JSON zostáva dostupný.
- [x] Úloha 6 (M, závisí od 3–5): samostatná warnings sekcia pri HTTP 200 bez zahodenia dát.
- [x] Overiť loading, initial error, retry, background error s cache a izoláciu pri zmene run/target.
- [x] Overiť existujúcu rollback invalidáciu pre Power, úspech/chybu a neovplyvnený iný run; produkčné hooks bez zbytočného prepisovania.

### Kontrolný bod 3

- [x] Počty zodpovedajú vráteným entries; orphan/partial dáta sa nestrácajú a nepredstierajú úplnosť.
- [x] Prešli relevantné inventory/rollback testy a typecheck.

## Fáza 4 — overenie a odovzdanie

- [x] Úloha 7 (S, závisí od 1–6): spustiť presný výber štyroch Vitest súborov z plánu.
- [x] `npm.cmd run typecheck`, cielený ESLint, JSON parse, `git diff --check` prešli.
- [x] Manuálne overiť Power/VMware, dlhé mená a warnings na 360/390 px a desktope, keyboard/focus disclosures; zaznamenať prípadný blocker.
- [x] Review: bez nových provider fallbackov, závislostí, generických abstrakcií a ručných Orval zmien.
- [ ] Potvrdiť podporovaný BE pred nasadením; nerozširovať scope na sken všetkých orphan hostov.
- [x] Aktualizovať plán/TODO skutočnými výsledkami; implementáciu odovzdať atomickými commitmi iba autorizovaných zmien.
- [x] Uviesť spustené kontroly a že celá sada/produkčný build neboli spustené; bez push/merge v plánovacej úlohe.

## Dôkazy overenia — 2026-11-05

- Východiskový Vitest: inventory + rollback, 21/21 prešlo. Po mechanickom oddelení VMware rendereru pôvodných 7/7 inventory testov prešlo.
- Red fáza: nové testy zachytili blokovaný Power GET (obe veľkosti písmen) a chýbajúce locale kľúče. Power test odhalil prijatie nesprávneho array typu pre scalar FlashCopy map; opravené file-local typovými kontrolami.
- Záverečný `npm.cmd exec -- vitest run` s explicitnými štyrmi cestami z plánu: 4/4 súbory, 52/52 testov prešlo. Po vizuálnej úprave LPAR riadku opakovaný iba Power component test: 15/15 prešlo.
- `npm.cmd run typecheck`: prešlo; po poslednej úprave znova prešlo. Cielený ESLint siedmich TS/TSX súborov z plánu prešiel; po poslednej úprave samostatný ESLint Power komponentu znova prešiel.
- JSON parse EN/SK/CS a 49 Power kľúčov v každom jazyku, parita kľúčov a placeholderov cez locale test: prešlo. `powerUnsupported` je odstránený. `git diff --check`: prešlo. Celá testovacia sada ani produkčný build neboli spustené.
- Natívny Edge: skutočná lokálna aplikácia prešla z blokovania Power na loading a error/retry UI; živý GET sa skončil chybou cieľového BE. Úspešná end-to-end odpoveď zo skutočného HMC/FlashSystem tým nie je potvrdená.
- Vizuálne overenie kompletných dát cez dočasný lokálny fixture náhľad skutočného kontajnera a rendererov s predvyplnenou QueryClient cache, bez backendových operácií: Power 360/390 px a širší 900 px panel, VMware datastores/tiers, warnings, co-holding, dlhé identifikátory a LPAR/adaptéry. V konzole po načítaní náhľadu iba informatívna správa React DevTools.
- Úzky náhľad odhalil stláčanie mena LPAR badge-mi; finálne meno má vlastný riadok a stavy sa zalamujú pod ním. Overené znova pri 360 px. Klávesové prepínanie natívnych disclosures a zatvorenie LPAR cez Space boli overené v Edge; v jsdom sa testuje focus, pretože nepodporuje natívnu aktiváciu summary.
- Manuálne overenie použilo fixture dáta; úplné integračné overenie cieľového BE ostáva krokom pred nasadením. Dočasné QA súbory sa neodovzdávajú v commite. Žiadny push/merge.
