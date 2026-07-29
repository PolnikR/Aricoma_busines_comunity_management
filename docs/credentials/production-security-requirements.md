# Produkčné bezpečnostné požiadavky pre credentials

Samotné zašifrovanie hesla vo frontende nestačí. Produkčná bezpečnosť závisí
od celého reťazca medzi prehliadačom, backendom a úložiskom tajných údajov.

## 1. HTTPS

Frontend načítava public key z:

```http
GET /credentials/pubkey
```

Bez HTTPS môže útočník komunikáciu zachytiť a namiesto backendového public key
poslať vlastný kľúč:

```text
Frontend ──► útočník ──► backend
             │
             └── podstrčí vlastný public key
```

Frontend potom heslo správne zašifruje, ale kľúčom útočníka. Produkcia preto
musí byť dostupná cez HTTPS.

HTTPS zároveň chráni:

- public key pred podvrhnutím,
- request pred manipuláciou,
- ostatné údaje v requeste,
- response backendu.

## 2. Backendové dešifrovanie

Frontend používa:

```text
RSA-OAEP + SHA-256
```

Backend musí používať kompatibilné nastavenie:

```text
Public key vo frontende
       │
       ▼
RSA-OAEP + SHA-256 šifrovanie
       │
       ▼
POST /submit_credential
       │
       ▼
RSA-OAEP + SHA-256 dešifrovanie privátnym kľúčom
```

Treba overiť, že backend:

- správne dekóduje Base64,
- používa zodpovedajúci privátny kľúč,
- používa RSA-OAEP, nie starší RSA PKCS#1 v1.5,
- používa SHA-256,
- odmietne neplatný ciphertext,
- nevráti dešifrované heslo v chybe alebo logu.

Ak sa parametre nezhodujú, frontend odošle validný encrypted payload, ale
backend ho nedokáže dešifrovať.

## 3. Bezpečné uloženie privátneho kľúča

Public key môže poznať každý. Privátny kľúč musí zostať tajný.

Nemal by byť:

- vo frontendovom repozitári,
- v Git repozitári backendu,
- v Docker image,
- v obyčajnom konfiguračnom JSON súbore,
- vypisovaný do logov.

Mal by byť uložený napríklad v:

- HashiCorp Vault,
- Azure Key Vault,
- AWS Secrets Manager,
- Kubernetes Secret s ďalším zabezpečením,
- inom firemnom secrets manageri.

Ak niekto získa privátny kľúč, môže dešifrovať zachytené credential requesty.

## 4. Bezpečné uloženie hesla

Backend musí heslo po dešifrovaní použiť alebo uložiť. Nemal by ho ukladať ako
obyčajný text v JSON alebo databáze.

Pre credentials používané na pripojenie k VMware sa heslo nedá iba hashovať.
Backend ho neskôr potrebuje získať a použiť, preto musí byť reverzibilne
šifrované alebo uložené v secrets manageri.

```text
Heslo používateľa na login
→ hashovanie

Heslo k externému VMware providerovi
→ bezpečne šifrované uloženie alebo secrets manager
```

## 5. Rotácia kľúčov

Kryptografické kľúče by nemali zostať rovnaké navždy. Môžu expirovať, byť
kompromitované alebo vyžadovať výmenu podľa firemnej politiky.

Pri rotácii backend vytvorí nový pár:

```text
nový public key
nový private key
```

Frontend momentálne public key cacheuje v pamäti. Ak backend kľúč vymení počas
otvorenej aplikácie, frontend môže krátko používať starý public key.

Backend preto potrebuje stratégiu, napríklad:

- určitý čas podporovať starý aj nový privátny kľúč,
- označiť key ID vo response a requeste,
- pri chybe dešifrovania dovoliť frontendu obnoviť public key a submit zopakovať,
- nastaviť cache timeout.

Robustnejší budúci kontrakt môže vyzerať:

```json
{
  "keyId": "credentials-key-2026-07",
  "publicKey": "-----BEGIN PUBLIC KEY-----..."
}
```

Submit potom obsahuje aj identifikátor kľúča:

```json
{
  "password": "BASE64_CIPHERTEXT",
  "password_encrypted": true,
  "key_id": "credentials-key-2026-07"
}
```

Backend tak presne vie, ktorý privátny kľúč má použiť.

## 6. Integračný test

Unit test overí, že frontend zavolal Web Crypto správne. Neoverí však
kompatibilitu s reálnym backendom.

Reálny integračný test musí overiť celý flow:

1. Backend poskytne public key.
2. Frontend ho načíta.
3. Frontend zašifruje testovacie heslo.
4. Frontend odošle `password_encrypted: true`.
5. Backend payload dešifruje.
6. Backend credential uloží.
7. Provider credential použije pri pripojení k testovaciemu VMware alebo IBM systému.
8. `GET /get_credentials` nevráti heslo.
9. Logy neobsahujú plaintext heslo.
10. Neplatný ciphertext je bezpečne odmietnutý.

Až tento test dokáže, že jednotlivé správne časti spolu skutočne fungujú.

## Zhrnutie

Aktuálny frontend rieši svoju časť:

```text
heslo → Web Crypto → encrypted payload
```

Produkčné riešenie však tvorí celý reťazec:

```text
HTTPS
  → dôveryhodný public key
  → frontendové šifrovanie
  → bezpečný prenos
  → backendové dešifrovanie
  → bezpečné uloženie
  → použitie credentialu
  → rotácia kľúčov
  → audit bez úniku hesla
```

Ak zlyhá ktorákoľvek časť reťazca, samotné správne použitie Web Crypto vo
frontende bezpečnosť celého systému nezaručí.
