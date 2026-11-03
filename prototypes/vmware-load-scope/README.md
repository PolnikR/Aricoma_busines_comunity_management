# Posúvanie providerov podľa spike

Samostatný HTML náhľad: otvor index.html alebo http://127.0.0.1:5192/.

Aktuálny krok rieši iba provider navigáciu. Návrh umiestnenia filtrov je odložený; doplnené podmienky v záložke boli odstránené. Ukážka má desať VMware providerov na overenie pretečenia, nie živý inventár.

Zdroj správania: spike/ant-design-shell, src/shared/components/tabs/Tabs.tsx a ResourcesPage.tsx. Spike nemá pevný počet viditeľných providerov: rozhoduje šírka pásu. Záložka má maximum 256 px, nezalamuje sa. Pri pretečení sa zobrazia šípky so šírkou 36 px. Posun je max(160 px, 80 % šírky viewportu záložiek); na začiatku/konci je príslušná šípka disabled. Bez pretečenia obe zmiznú. Zachované sú horizontálne posúvanie, ArrowLeft/ArrowRight s prechodom cez okraj, Home/End, jediný tab stop a automatické dosunutie vybraného providera.

Pás má v náhľade výšku 50 px a jeden divider. Vonkajší rám sa neorezáva. Spodný testovací prepínač Providers umožňuje 2/4/10 providerov; State zostáva na preverenie request stavov. Dáta sú lokálne fixtures. Produkčný kód sa nemenil.

Overenie revízie:

- node --check prototypes/vmware-load-scope/preview.js — PASS.
- Browser/CDP: 320, 768, 1024, 1440 px; navigácia 50 px, bez horizontálneho pretečenia dokumentu.
- Skutočné kliky/klávesy: next/previous, deaktivácia na okrajoch, horizontálny wheel, Home/End, oba smery šípok s wrap-around, dosunutie aktívneho providera, jeden tab stop, skrytie šípok po zmenšení počtu providerov — PASS, nula runtime výnimiek.
- Vizuálne prezreté desktop/mobil a tmavý motív. PNG: %TEMP%/abco-vmware-scope-preview/providers-1440.png, providers-320.png, providers-end-1440.png, providers-fit.png, providers-dark.png.
- git diff --check — PASS. Celá suite a build neboli spustené; ide o izolovaný HTML prototyp.
