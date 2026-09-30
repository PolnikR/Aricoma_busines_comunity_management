# Checklist: Responzívne písmo v shared DataTable

Autoritatívny plán: [datatable-responsive-font-plan.md](datatable-responsive-font-plan.md).
Stav: plán odsúhlasený v návrhu, implementácia nezačatá.

- [ ] T1: Prejsť konzumentov `DataTable`, zapísať rodičovské kontexty a rizikové miesta do plánu.
- [ ] T2: Pridať `@container/data-table` a responzívny default buniek a hlavičky (scroll aj fit).
- [ ] T2: Upraviť rodičov označených v T1 (ak treba).
- [ ] T3: Zosúladiť `AccessLogsTable`, `RecoveryApplicationsTable` a `VirtualMachineDetailPanel`.
- [ ] Kontrolný bod: Overiť generované CSS alebo browser pod a nad prahom 80rem.
- [ ] T4: Browser kontrola pri 1024/1280/1440/1920 px na vybraných stránkach, oboch hustotách.
- [ ] T4: Spustiť focused Vitest, cielený ESLint a `git diff --check` podľa plánu.
- [ ] T4: Zapísať výsledky a vytvoriť atomický commit.
