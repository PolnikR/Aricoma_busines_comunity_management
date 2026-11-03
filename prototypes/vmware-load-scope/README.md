# VMware: podmienky načítania v existujúcej záložke

Samostatný HTML prototyp. Otvor index.html v prehliadači alebo http://127.0.0.1:5192/. Bez závislostí, API a ukladania stavu.

Po spätnej väzbe boli odstránené všetky tri pôvodné návrhy: samostatný pás, pridaná sekcia navigácie aj duplicitné tlačidlo rozsahu. Prefix a tag sú teraz súčasťou existujúcej záložky VMware VMs / vm-01. Majú zámok a tlmené zobrazenie: TEST-* · ABC Orchestrator. Nepridávajú nový riadok ani ovládací prvok.

Navigácia zostáva vysoká 50 px aj na mobile; dlhšie záložky sa horizontálne posúvajú. Hodnoty patria konkrétnemu providerovi, preto zostávajú pri vm-01 aj po prepnutí na vm-03.

Existujúce Filters otvára jediné spoločné okno: hore sú read-only podmienky providera, pod nimi filtre viditeľnej tabuľky. Pri vm-03 bez pevných podmienok sa read-only sekcia skryje. Vymazanie table filtrov nemení provider podmienky.

Search loaded VMs je návrh lokálneho zužovania už načítaného zoznamu. Aktuálna produkčná aplikácia pri pevnom filtri ovládanie zamyká; týmto prototypom sa produkčná logika nemení.

Overenie tejto revízie:

- node --check prototypes/vmware-load-scope/preview.js a git diff --check: PASS.
- Izolovaný Chrome: 320, 768, 1024, 1440 px; bez horizontálneho pretečenia dokumentu, navigácia 50 px, toolbar bezprostredne po navigácii, nula dodatočných scope tlačidiel.
- Skutočné kliky/klávesy: existujúce Filters a jeho provider detail, Escape a návrat fokusu, Apply/reset, prepnutie providera, zobrazenie podmienok počas loading: PASS, bez runtime výnimiek. Skontrolovaný svetlý aj tmavý motív.
- PNG v %TEMP%/abco-vmware-scope-preview/: tab-1440.png, tab-320.png, tab-dark.png, filters-existing-dialog.png.
- Celá suite, production build a automatický axe audit neboli spustené.
