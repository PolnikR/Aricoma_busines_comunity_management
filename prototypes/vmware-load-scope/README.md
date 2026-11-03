# Posúvanie providerov podľa spike

Samostatný HTML náhľad: otvor index.html alebo http://127.0.0.1:5192/.

Aktuálny krok rieši iba provider navigáciu. Návrh umiestnenia filtrov je odložený; doplnené podmienky v záložke boli odstránené. Ukážka má desať VMware providerov na overenie pretečenia, nie živý inventár.

Nadväzuje na spike/ant-design-shell Tabs, s novým limitom štyroch viditeľných providerov podľa požiadavky používateľa. Navigácia sa nenaťahuje na šírku tabuľky: každá záložka má 160 px a medzi nimi 4 px, takže desktop viewport štyroch záložiek má 652 px. Pri menšom počte providerov sa pás zúži. Na mobile sa zmestí menej položiek. Šípky posúvajú po celých viditeľných záložkách, nie o pôvodných 80 %, aby sa na desktope zobrazila ďalšia celá štvorica. Horizontálny wheel/touch, deaktivácia na okrajoch, Home/End, ArrowLeft/ArrowRight a dosunutie aktívneho providera zostali zachované. Divider má stále šírku karty.

Pás má v náhľade výšku 50 px a jeden divider. Vonkajší rám sa neorezáva. Spodný testovací prepínač Providers umožňuje 2/4/10 providerov; State zostáva na preverenie request stavov. Dáta sú lokálne fixtures. Produkčný kód sa nemenil.

Overenie revízie:

- node --check prototypes/vmware-load-scope/preview.js — PASS.
- Browser/CDP: 320, 768, 1024, 1440 px; navigácia 50 px, bez horizontálneho pretečenia dokumentu; pri 1024/1440 px overený viewport presne 652 px a navigácia užšia ako tabuľka.
- Skutočné kliky/klávesy: next/previous, deaktivácia na okrajoch, horizontálny wheel, Home/End, oba smery šípok s wrap-around, dosunutie aktívneho providera, jeden tab stop, skrytie šípok po zmenšení počtu providerov — PASS, nula runtime výnimiek.
- Vizuálne prezreté desktop/mobil a tmavý motív. PNG: %TEMP%/abco-vmware-scope-preview/providers-1440.png, providers-320.png, providers-end-1440.png, providers-fit.png, providers-dark.png.
- git diff --check — PASS. Celá suite a build neboli spustené; ide o izolovaný HTML prototyp.
