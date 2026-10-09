# Implementačný plán: Recovery Applications – opravy z auditu

Spec: `tasks/recovery-app-audit-fixes-spec.md`. Úlohy: `tasks/recovery-app-audit-fixes-todo.md`.

## Prehľad

Päť nezávislých opráv T1–T5 v poradí podľa priority. Každá je samostatný commit.

Pred commitom sa každá úloha overí:
1. cielený `npm exec vitest run <test súbory>`,
2. `npx eslint <zmenené súbory>`,
3. `npx tsc -b` s 0 chybami (baseline je 0),
4. `git diff --check`.

Do commitu idú iba explicitne vymenované cesty. Zmeny sa nepushujú.

## Úlohy

- [ ] T1: IBM Power source/target bez role, rovnaký provider na oboch stranách (S)
- [ ] T2: Zamknutý push pri editácii nasadenej appky (S)
- [ ] T3: IBM Power inventár bez volania endpointu, s info hláškou (S)
- [ ] T4: Zachovanie `notificationEmail` (S)
- [ ] T5: Cieľový provider, policy set a notification email v DetailView (S)

## Kontrolný bod (koniec)

- [ ] `npx tsc -b`: 0 chýb.
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications` je zelené.
- [ ] Report s tabuľkou DONE / BLOCKED / NOT NEEDED a zoznamom úloh pre BE.

## Riziká

| Riziko | Mitigácia |
|---|---|
| Zamknutý push v T2 zablokuje editáciu, ak Airflow provider nie je dostupný | Validácia orchestration providera už existuje a zobrazí chybu. Ide o zámerné dočasné obmedzenie, kým to nevyrieši BE. |
| Rovnaký Power provider na oboch stranách je v lab prostredí bežný, v produkcii nemusí dávať zmysel | Kopíruje BE pravidlo B2. Zmenu pravidla musí urobiť BE. |
