# TODO: IBM Power Recovery Application Inventory

Stav: iba plán, implementácia nezačala. Podrobné súbory, akceptácia a príkazy sú v [pláne](power-recovery-app-inventory-plan.md).

## Fáza 0 — pred implementáciou

- [ ] Používateľ schválil implementáciu.
- [ ] Znovu preveriť Git stav a zachovať všetkých osem OpenAPI/Orval vstupných zmien vrátane troch nových súborov.
- [ ] Nevykonávať manuálne úpravy generated súborov, BE ani nový API hook.

## Fáza 1 — VMware baseline a preklady

- [ ] Úloha 1 (M, bez závislostí): oddeliť VMware JSX do `RecoveryApplicationVmwareInventory.tsx`; spoločný GET a obal ponechať.
- [ ] Pôvodné VMware, JSON a cache/retry testy prejdú; fixtures zahŕňajú reálne Zod defaulty.
- [ ] Úloha 2 (M, závisí od 1): pripraviť SK/EN/CS kľúče pre summary, ownership, LPAR, adaptéry, hosty, volumes, FlashCopy a warnings.
- [ ] Pridať test parity kľúčov/placeholderov a validovať JSON. `powerUnsupported` zatiaľ ponechať do zapojenia Power vetvy.

### Kontrolný bod 1

- [ ] VMware zobrazenie nezmenené; preklady pripravené a overené cielenými testami.

## Fáza 2 — Power request a LPAR

- [ ] Úloha 3 (M, závisí od 1–2): odstrániť `!isPower` gate; target resolver zdieľaný pre obe platformy, bez fallbackov.
- [ ] Overiť skutočný GET s target ID pre oba casingy platformy; inactive/no-run/missing-target bez fetchu.
- [ ] Dispatch podľa response platform, legacy VMware default a bezpečné zobrazenie neznámej platformy.
- [ ] Pridať `RecoveryApplicationPowerInventory.tsx` a jeho test; summary a tiers/LPAR zobrazenie.
- [ ] Pokryť run/foreign/unattached/unknown, null LPAR a run + other_hosts bez straty detailu alebo warningu.
- [ ] Odstrániť zastarané použitie aj tri preklady `powerUnsupported` a nahradiť blokovací test.
- [ ] Úloha 4 (S, závisí od 3): doplniť UUID/state/RMC/managed system, vFC a Ethernet podľa overených BE kľúčov.
- [ ] Overiť null/absent/[]/neplatné record typy a nuly; zachovať technický JSON a kopírovateľné identifikátory.

### Kontrolný bod 2

- [ ] Power GET → LPAR UI funguje; found nie je zamieňané s existenciou a co-holding warning je viditeľný aj pri zbalení.
- [ ] Prešli oba inventory testy a cielený ESLint dotknutých súborov.

## Fáza 3 — hosty, volumes a čiastočné výsledky

- [ ] Úloha 5 (S, závisí od 4): samostatná recovered_hosts sekcia vrátane hostov bez LPAR.
- [ ] Hostname/storage provider/active ports/WWPN a volumes; žiadny filter podľa found.
- [ ] Vdisk ID/meno, SCSI 0, boot flag, capacity bytes, pool a FlashCopy map/source/CG; nuly neprepísať placeholderom.
- [ ] Host ostane viditeľný aj pri nedostupných detailoch, prázdnych volumes a warnings; JSON zostáva dostupný.
- [ ] Úloha 6 (M, závisí od 3–5): samostatná warnings sekcia pri HTTP 200 bez zahodenia dát.
- [ ] Overiť loading, initial error, retry, background error s cache a izoláciu pri zmene run/target.
- [ ] Overiť existujúcu rollback invalidáciu pre Power, úspech/chybu a neovplyvnený iný run; produkčné hooks bez zbytočného prepisovania.

### Kontrolný bod 3

- [ ] Počty zodpovedajú vráteným entries; orphan/partial dáta sa nestrácajú a nepredstierajú úplnosť.
- [ ] Prešli relevantné inventory/rollback testy a typecheck.

## Fáza 4 — overenie a odovzdanie

- [ ] Úloha 7 (S, závisí od 1–6): spustiť presný výber štyroch Vitest súborov z plánu.
- [ ] `npm.cmd run typecheck`, cielený ESLint, JSON parse, `git diff --check` prešli.
- [ ] Manuálne overiť Power/VMware, dlhé mená a warnings na 360/390 px a desktope, keyboard/focus disclosures; zaznamenať prípadný blocker.
- [ ] Review: bez nových provider fallbackov, závislostí, generických abstrakcií a ručných Orval zmien.
- [ ] Potvrdiť podporovaný BE pred nasadením; nerozširovať scope na sken všetkých orphan hostov.
- [ ] Aktualizovať plán/TODO skutočnými výsledkami; implementáciu odovzdať atomickými commitmi iba autorizovaných zmien.
- [ ] Uviesť spustené kontroly a že celá sada/produkčný build neboli spustené; bez push/merge v plánovacej úlohe.
