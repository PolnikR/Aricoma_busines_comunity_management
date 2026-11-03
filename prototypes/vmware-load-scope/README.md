# VMware: zobrazenie rozsahu načítania

Samostatný vizuálny prototyp. Otvor `index.html` v prehliadači; CSS a JavaScript sú lokálne, bez závislostí a API. Dočasný náhľad počas tejto session: http://127.0.0.1:5192/.

Odporúčaný variant **A – Scope strip** má pod view záložkami úzky pás s pevným prefixom a tagom. Podmienky sú spojené AND, majú zámok a nemajú odstránenie krížikom. Detail vysvetľuje pôvod v konfigurácii providera. Metriky pomenúvajú, že ide o načítaný rozsah.

Spodný prepínač porovnáva tri umiestnenia:

- `?variant=strip`: A, samostatný čitateľný pás pod záložkami; odporúčanie.
- `?variant=header`: B, podmienky vedľa view navigácie; na úzkej obrazovke sa zalomia.
- `?variant=compact`: C, hodnoty až v detaile tlačidla Loading scope; menej priestoru, horšia viditeľnosť podmienok.

Provider `vm-01` má ukážkové podmienky `TEST-` a `ABC Orchestrator`. `vm-03` ukazuje provider bez pevného obmedzenia. Podmienky zostávajú viditeľné pri načítavaní aj chybe. Rozbaľovací State prepína loaded/loading/error/empty; Refresh a Retry simulujú načítanie.

**Navrhované oddelenie správania:** Search loaded VMs a Table filters zužujú iba ukážkový načítaný zoznam. Ich vymazanie nemení provider scope. Toto lokálne vyhľadávanie je návrh interakcie; aktuálna produkčná implementácia pri pevnom provider filtri search/filter controls zamyká. Produkčný kód ani pravidlá načítania sa týmto prototypom nemenia. Editácia skutočného providera nie je zapojená.

## Overenie

- `node --check prototypes/vmware-load-scope/preview.js` — PASS.
- Izolovaný Chrome/CDP: 3 varianty × 4 šírky (320, 768, 1024, 1440 px) — 12 kontrol bez horizontálneho pretečenia dokumentu a bez orezania vonkajšieho rámu.
- Skutočné kliky/klávesy: detail rozsahu, Escape a návrat fokusu, table filter/apply/remove, search/empty/reset, zmena providera, loading/error/retry/empty — PASS, bez runtime výnimiek. Overený aj tmavý motív.
- PNG dôkazy sú v `%TEMP%/abco-vmware-scope-preview/`, napr. `strip-1440.png`, `strip-320.png`, `scope-details.png`.
- `git diff --check` — PASS. Celá test suite, build a automatický axe audit neboli spustené; ide o izolovaný HTML prototyp.
