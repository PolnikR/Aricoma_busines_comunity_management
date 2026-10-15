# Checklist: Lazy loading Resources, Resources ISE a Providers

Plán: [inventory-routes-lazy-loading-plan.md](inventory-routes-lazy-loading-plan.md).

- [ ] T1: Spustiť existujúce routing testy; doplniť izolovaný test odloženého načítania všetkých troch stránok a overiť jeho zlyhanie na statických importoch.
- [ ] T2 (po T1): Previesť Resources a Resources ISE na module-level `lazy()` a lokálny `Suspense`; upraviť iba dve príslušné snapshot položky a overiť resource prípady.
- [ ] T3 (po T2): Previesť Providers rovnakým vzorom; upraviť jeho snapshot položku a overiť Providers prípad.
- [ ] Kontrolný bod A: Test načítania, route contract a page bindings prejdú; snapshot má iba tri plánované zmeny elementov, URL a handles sú zachované.
- [ ] T4 (po T1–T3): Spustiť všetky cielené príkazy z plánu a overiť priame URL aj navigáciu z dashboardu v prehliadači; zaznamenať prípadný blocker.
- [ ] Kontrolný bod B: Review diffu a samostatný implementačný commit; uviesť výsledky kontrol a že celý suite/build nebol spustený.

## Výsledky

Implementácia sa ešte nezačala. Pri realizácii sem zaznamenať vykonané príkazy, výsledky browserového overenia a hash implementačného commitu.
