# Checklist: Responzívne písmo v shared DataTable

Autoritatívny plán: [datatable-responsive-font-plan.md](datatable-responsive-font-plan.md).
Stav: implementované, automatické kontroly prešli. Browser overenie ostáva nevykonané, lebo prehliadač nie je dostupný.

- [x] T1: Prejsť konzumentov `DataTable`, zapísať rodičovské kontexty a rizikové miesta do plánu.
- [x] T2: Pridať `@container/data-table` a responzívny default buniek a hlavičky (scroll aj fit).
- [x] T2: Upraviť rodičov označených v T1 (nebolo treba).
- [x] T3: Zosúladiť `AccessLogsTable`, `RecoveryApplicationsTable` a `VirtualMachineDetailPanel` (panel s vlastným kontajnerom `vm-detail`, pozri plán).
- [x] Kontrolný bod: Overiť generované CSS cez lokálny Tailwind `compile` (bez browsera).
- [ ] T4: Browser kontrola pri 1024/1280/1440/1920 px na vybraných stránkach, oboch hustotách.
- [x] T4: Spustiť focused Vitest, cielený ESLint a `git diff --check` podľa plánu.
- [x] T4: Zapísať výsledky a vytvoriť atomický commit.

## Výsledky overenia

- `npm.cmd exec vitest run` s piatimi súbormi z plánu (DataTable, AccessLogsTable, RecoveryApplicationsTable, VirtualMachineDetailPanel, VirtualMachinesTable): 5 súborov, 39 testov prešlo v dvoch po sebe idúcich behoch. Prvý beh pri studenom transforme trval 178 s a mal 4 pády. Príčinu sa nepodarilo zistiť, lebo výstup sa nezachoval. Pri opakovaní sa pády neobjavili. Pravdepodobne išlo o timeouty pri zaťaženom stroji (súbežná práca v inom súbore).
- `npm.cmd exec eslint -- <4 zmenené súbory> --max-warnings 0`: prešlo.
- Inline Node skript s `compile` z lokálneho `tailwindcss`: overené `container-type: inline-size`, názvy kontajnerov `data-table` a `vm-detail`, podmienka `width >= 80rem` a veľkosti 12/13 px. Nie je to browser layout test.
- `git diff --check` na zmenených súboroch: prešlo.
- Kompletná sada, typecheck a build neboli spustené.
- Nevykonané: screenshoty, meranie reálnych šírok a zoomu, vizuálna kontrola stránok a roztiahnutého detail drawera.
