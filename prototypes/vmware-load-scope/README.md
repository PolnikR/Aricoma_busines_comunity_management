# Provider lišta: štyri položky a podmienky napravo

Samostatný HTML prototyp: index.html alebo http://127.0.0.1:5192/.

Vľavo je navigácia s maximálne štyrmi viditeľnými providermi. Napravo v tej istej lište je read-only zobrazenie Name prefix a Tag pre vybraného providera. Pre vm-01 sú TEST- a ABC Orchestrator; ostatné ukážkové providery majú Any. Zmena providera, čistenie table filtrov a request stavy nemenia umiestnenie podmienok. Nový riadok ani ďalšie tlačidlo filtrov nepribudli.

Na širokom desktope zostáva viewport štyroch providerov 652 px. Na užších obrazovkách sa pás zúži tak, aby zostal priestor pre podmienky. Na mobile sú hodnoty napravo pod sebou v tej istej lište a názov typu je skrátený na VMs. Šípky, horizontálny wheel/touch, Home/End, ArrowLeft/ArrowRight, wrap-around a automatické dosunutie aktívneho providera zostali zachované. Spodný prepínač 2/4/10 providerov je iba pomôcka prototypu.

Príklad používa lokálne dáta, nemá API ani perzistenciu. Search loaded VMs je návrh lokálneho zužovania vzorky; produkčný kód a pravidlá providera sa nemenili.

Overenie:

- node --check prototypes/vmware-load-scope/preview.js — PASS.
- Browser/CDP: 320, 768, 1024, 1440 px; nula runtime výnimiek a horizontálneho pretečenia dokumentu.
- Overená pravá pozícia podmienok, hodnoty TEST-/ABC Orchestrator, zmena na Any pri výbere iného providera, presne 652 px viewport pri 1440 px.
- Prev/next, deaktivácia na okrajoch, horizontálny wheel, klávesnica Home/End/ArrowLeft/ArrowRight, wrap-around, jeden tab stop, dosunutie vybranej položky, skrytie šípok pri malom počte providerov — PASS.
- Desktop/mobil a tmavý motív prezreté; PNG v %TEMP%/abco-vmware-scope-preview/providers-1440.png a providers-320.png.
- git diff --check — PASS. Celá suite, build a automatický axe audit neboli spustené.
