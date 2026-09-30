# Checklist: Responzívna VMware tabuľka

Autoritatívny plán: [vmware-table-responsive-plan.md](vmware-table-responsive-plan.md).
Stav: implementované, automatické kontroly prešli; browser overenie zostáva nevykonané. Používateľ požiadal vykonať plán a commitnúť zmeny aj po oznámení nedostupného prehliadača.

- [ ] T1: Zmerať šírku kontajnera, písmo a zalamovanie pri 1280/1440/1920 px a zoome 100/125 % v oboch hustotách.
- [x] T1: Zapísať predbežný prah kontajnera a konzumentov dotknutých komponentov do plánu (bez browser merania).
- [x] T2: Zaviesť lokálny prechod hlavného textu 13 → 12 px a vodorovného odsadenia 12 → 8 px.
- [x] T2: Implementovať nezalamovanie CPU/RAM a krátkych stavov, zachovať existujúci prístup k dlhým hodnotám a detaily Comfortable; vizuálny výsledok ešte overiť.
- [ ] Kontrolný bod: Porovnať výsledok s T1, overiť šírky tesne pod a nad prahom a zachovať scroll pri nedostatku miesta.
- [ ] T3: Browser kontrola pri 320/768/1024/1280/1440/1920 px, desktop pri 125 % zoome, oba režimy hustoty a en/sk/cs.
- [ ] T3: Overiť dlhé hodnoty, tagy, loading/empty stav, klávesnicu, výber VM a dosiahnuteľnosť posledného stĺpca.
- [x] T3: Spustiť focused Vitest, cielený ESLint a `git diff --check` podľa plánu.
- [x] T3: Zaznamenať výsledky a obmedzenia overenia.
- [x] T3: Vytvoriť atomický implementačný commit iba z dotknutých súborov (`fix: keep VMware inventory rows compact on narrow screens`).

## Výsledky implementačného overenia

- `npm.cmd exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx` — 2 súbory, 17 testov prešlo.
- `npm.cmd exec eslint -- src/features/discovery-inventory/resources/components/vmware/VirtualMachinesTable.tsx src/features/discovery-inventory/resources/config/vmwareColumns.tsx --max-warnings 0` — prešlo.
- `node --input-type=module` s inline kontrolou cez lokálny Tailwind `compile` — overené generovanie pomenovaného kontajnera, podmienky `width >= 80rem`, veľkostí 12/13 px a `white-space: nowrap`. Toto nie je browser layout test.
- `git diff --check` — prešlo.
- Kompletná testovacia sada, typecheck a produkčný build neboli spustené; zmena je lokálna a prezentačná.
- Nevykonané: screenshoty, meranie skutočných šírok a zoomu, vizuálne en/sk/cs a klávesnicový browser smoke test. Nedostupný prehliadač nie je úspešné vizuálne overenie.
