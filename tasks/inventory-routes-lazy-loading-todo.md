# Checklist: Lazy loading Resources, Resources ISE a Providers

Plán: [inventory-routes-lazy-loading-plan.md](inventory-routes-lazy-loading-plan.md).

- [ ] T0 (pred úpravou rout): Zaznamenať baseline SHA, git status, Node/Vite, build mode; spustiť `npm.cmd exec -- vite build --manifest` a uložiť build log, `dist/.vite/manifest.json`, súpis JS assetov mimo prepisovaného `dist`.
- [ ] T0 Network baseline: Produkčný `vite preview`; pri zhodných podmienkach zachytiť cold Dashboard `/`, prvé návštevy všetkých troch rout a warm návrat; uložiť HAR/Network údaje alebo uviesť konkrétny blocker.
- [ ] T1: Spustiť existujúce routing testy; doplniť izolovaný test odloženého načítania všetkých troch stránok a overiť jeho zlyhanie na statických importoch.
- [ ] T2 (po T1): Previesť Resources a Resources ISE na module-level `lazy()` a lokálny `Suspense`; upraviť iba dve príslušné snapshot položky a overiť resource prípady.
- [ ] T3 (po T2): Previesť Providers rovnakým vzorom; upraviť jeho snapshot položku a overiť Providers prípad.
- [ ] T4: Test načítania, route contract a page bindings prejdú; snapshot má iba tri plánované zmeny elementov, URL a handles sú zachované; prejde cielený ESLint a `git diff --check`.
- [ ] T5: Zopakovať produkčný `npm.cmd exec -- vite build --manifest` v rovnakých podmienkach; uložiť manifest a build log s SHA finálneho zdrojového stavu.
- [ ] T5: V manifeste/build artefaktoch preukázať dynamické entry pre Resources, Resources ISE a Providers; vyhodnotiť počiatočný importný graf a skutočné JS assety bez predpokladu troch nezávislých chunkov.
- [ ] T5: Zdokumentovať spoločné chunky/závislosti (najmä VMware/FlashSystem/IBM Power) a rozdiel raw/komprimovaných veľkostí vs. prenesených bajtov.
- [ ] T6 Network po zmene: Pri cold Dashboard overiť neprítomnosť zbytočného načítania route chunkov; pri prvej navigácii na každú z troch rout zdokumentovať vyžiadané lazy/shared chunky a dodatočné JS požiadavky.
- [ ] T6 Warm/cache: Overiť Resources → Resources ISE → Resources → Providers → Providers; pri návrate kontrolovať neexistenciu zbytočného prenosu rovnakých chunkov.
- [ ] T6 Funkčnosť: Priame URL s query/hash, sidebar, legacy redirecty, spomalená sieť, fallback/shell, Console/Network; skontrolovať zlyhanie načítania chunku a existujúcu error/recovery cestu.
- [ ] T6 Report: Tabuľka baseline vs. po zmene – cold Dashboard JS počet requestov, transfer KB, decoded KB, delta KB/%; prvá navigácia na každú stránku, použité chunky, warm výsledky, oba commity a lokácie dôkazov; neoverené alebo nulový efekt uviesť explicitne.
- [ ] Kontrolný bod: Po review diffu commitnúť iba súbory implementácie a dôkazový checklist, bez push/merge; kompletný test suite/celý `npm run build` neoznačiť za spustený, pokiaľ nebol.

## Výsledky

Implementácia sa ešte nezačala. Pri realizácii sem zaznamenať príkazy a výsledky oboch produkčných Vite buildov, cielených testov, browserového merania, manifestov, obmedzení a hash implementačného commitu.
