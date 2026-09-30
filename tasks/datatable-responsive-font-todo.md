# Checklist: Responzívne písmo v shared DataTable

Autoritatívny plán: [datatable-responsive-font-plan.md](datatable-responsive-font-plan.md).
Stav: implementované, automatické kontroly prešli. Správanie container query overené v headless Edge na statickej stránke. Kontrola reálnych stránok aplikácie ostáva nevykonaná.

- [x] T1: Prejsť konzumentov `DataTable`, zapísať rodičovské kontexty a rizikové miesta do plánu.
- [x] T2: Pridať `@container/data-table` a responzívny default buniek a hlavičky (scroll aj fit).
- [x] T2: Upraviť rodičov označených v T1 (nebolo treba).
- [x] T3: Zosúladiť `AccessLogsTable`, `RecoveryApplicationsTable` a `VirtualMachineDetailPanel` (panel s vlastným kontajnerom `vm-detail`, pozri plán).
- [x] Kontrolný bod: Overiť generované CSS cez lokálny Tailwind `compile` (bez browsera).
- [x] T4: Browser meranie prahu (headless Edge, statická stránka) pri kontajneri 1000–1896 px.
- [ ] T4: Kontrola reálnych stránok aplikácie v oboch hustotách (vyžaduje Keycloak a backend).
- [x] T4: Spustiť focused Vitest, cielený ESLint a `git diff --check` podľa plánu.
- [x] T4: Zapísať výsledky a vytvoriť atomický commit.

## Výsledky overenia

- `npm.cmd exec vitest run` s piatimi súbormi z plánu (DataTable, AccessLogsTable, RecoveryApplicationsTable, VirtualMachineDetailPanel, VirtualMachinesTable): 5 súborov, 39 testov prešlo v dvoch po sebe idúcich behoch. Prvý beh pri studenom transforme trval 178 s a mal 4 pády. Príčinu sa nepodarilo zistiť, lebo výstup sa nezachoval. Pri opakovaní sa pády neobjavili. Pravdepodobne išlo o timeouty pri zaťaženom stroji (súbežná práca v inom súbore).
- `npm.cmd exec eslint -- <4 zmenené súbory> --max-warnings 0`: prešlo.
- Inline Node skript s `compile` z lokálneho `tailwindcss`: overené `container-type: inline-size`, názvy kontajnerov `data-table` a `vm-detail`, podmienka `width >= 80rem` a veľkosti 12/13 px. Nie je to browser layout test.
- `git diff --check` na zmenených súboroch: prešlo.
- Kompletná sada, typecheck a build neboli spustené.
- Headless Edge na statickej stránke (scratchpad, mimo repozitára). Stránka mala rovnakú DOM štruktúru a triedy ako `DataTable` a detail VM, skopírované zo zdrojákov, a CSS skompilované lokálnym Tailwindom. Vypočítané `font-size` a `padding-left` buniek:

  | Šírka kontajnera | DataTable na plnú šírku | DataTable v 400 px | vm-detail 1400 px | vm-detail 420 px |
  |---|---|---|---|---|
  | 1000 px | 12 / 8 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |
  | 1246 px | 12 / 8 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |
  | 1266 px | 12 / 8 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |
  | 1296 px | 13 / 16 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |
  | 1416 px | 13 / 16 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |
  | 1896 px | 13 / 16 px | 12 / 8 px | 13 / 12 px | 12 / 8 px |

  Prepnutie nastáva medzi 1266 a 1296 px, teda na prahu 80rem = 1280 px. Od prahu platí pôvodný vzhľad (13 px, `px-4`). Úzky kontajner ostáva na 12 px aj pri širokom okne, ako sa rozhodlo vo variante A.
- Nevykonané: kontrola skutočných stránok aplikácie, pretože vyžaduje Keycloak a backend dáta. Neoverené ostáva aj posúvanie, zoom 125 % a roztiahnutý detail drawer v aplikácii.
