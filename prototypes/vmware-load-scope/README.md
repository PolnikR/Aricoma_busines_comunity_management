# Provider lišta a voliteľné podmienky

HTML náhľad: index.html alebo http://127.0.0.1:5192/. Lokálne ukážkové dáta, bez API a perzistencie.

Vľavo zostáva posúvanie maximálne štyroch providerov. Napravo sa zobrazujú iba skutočne nastavené podmienky. Prázdny prefix alebo pole tagov odstráni príslušnú položku vrátane labelu. Ak chýbajú obe, celý pravý blok vrátane zámku je skrytý a nezaberá miesto. Žiadne Any alebo náhradné hodnoty.

Viaceré tagy: na širokom okne prvé dva, pod 1100 px prvý; zostávajúci počet je +N. Kliknutie rozbalí všetky tagy s plnými názvami. Zoznam sa drží vo viewporte, zatvára sa Escape alebo kliknutím mimo. Dlhé názvy sú dostupné v plnom zozname. Sú to read-only podmienky. Rovnaké hodnoty vidno aj v existujúcom Filters detaile.

Ukážky:

- vm-01: TEST- a ABC Orchestrator.
- vm-03: žiadne podmienky, pravá časť prázdna.
- vm-04: iba prefix PROD-.
- vm-05: iba tag Production.
- vm-06: TEST- a päť tagov; desktop dva tagy +3, menšie okno prvý tag +4.
- vm-07: viacero tagov s dlhým názvom, bez prefixu.

Prototyp demonštruje prezentáciu viacerých tagov, nezavádza nové backend pravidlá AND/OR ani nemení produkčné API.

Overenie:

- node --check prototypes/vmware-load-scope/preview.js a git diff --check — PASS.
- Izolovaný Chrome: 320, 768, 1024, 1440 px; bez runtime výnimiek alebo horizontálneho pretečenia dokumentu.
- Zachované next/previous, Home/End, ArrowLeft/ArrowRight, wrap-around, roving focus, horizontálny wheel a skrývanie šípok pri malom počte providerov.
- Overené žiadne/prefix-only/tag-only podmienky, zmena providera, +3/+4 podľa šírky, otvorenie úplného päťpoložkového zoznamu, Escape a umiestnenie popovera vo viewporte.
- Vizuálne prezreté no-conditions.png, multiple-tags-1440.png, all-tags-320.png; dôkazy v %TEMP%/abco-vmware-scope-preview/.
- Celá suite, build a automatický axe audit neboli spustené; ide o izolovaný HTML prototyp.
