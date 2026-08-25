# Manuálne nasadenie abco-fe

Aplikácia beží ako nginx kontajner na serveri `10.99.99.53:8080`, Keycloak na `10.99.99.53:8081`.
Build (vrátane lint + typecheck + testov) prebieha **na serveri** v Dockeri — CI runner
zatiaľ neexistuje, takže tento postup je jediná cesta.

**Predpoklad:** funguje `ssh aricoma@10.99.99.53` a máš zmeny commitnuté lokálne.
Všetky príkazy nižšie spúšťaj **z lokálu, z koreňa repozitára** `abco-fe/`.

---

## Kroky

### 1. Skopíruj zdrojáky na server

```bash
rsync -az --delete --exclude node_modules --exclude dist \
  ./ aricoma@10.99.99.53:~/abco-fe-src/
```

Server nevidí GitLab, takže kód sa tam dostane len takto. `--delete` zahodí
v `~/abco-fe-src/` súbory, ktoré už v repozitári nie sú — inak by sa lokálne zmazaný
alebo premenovaný súbor buildoval ďalej a hľadal by si chybu, ktorá lokálne neexistuje.
Kontajnerov sa to netýka, tie sa vymieňajú až v kroku 5.

> Pozor: práve kvôli `--delete` spúšťaj príkaz naozaj z koreňa repozitára. Z iného
> adresára ti na serveri zmaže obsah `~/abco-fe-src/`.

### 2. Skontroluj Keycloak konfiguráciu

```bash
ssh aricoma@10.99.99.53 'cat ~/abco-fe-src/.env.production'
```

Musí vypísať presne:

```
VITE_KEYCLOAK_URL=http://10.99.99.53:8081
VITE_KEYCLOAK_REALM=aricoma
VITE_KEYCLOAK_CLIENT_ID=abcm-fe
```

Ak súbor chýba alebo je prázdny, build prejde, ale aplikácia skončí v redirect loope.
Nepokračuj, kým to nesedí.

### 3. Zbuilduj image

```bash
ssh aricoma@10.99.99.53 '
  cd ~/abco-fe-src
  docker build -t abco-fe:$(git rev-parse --short HEAD) -t abco-fe:latest .
'
```

Trvá to niekoľko minút — v builde bežia aj `lint`, `typecheck` a testy. Ak niektorý
padne, build skončí a **nič sa nenasadí** (starý kontajner beží ďalej). Oprav to
lokálne a začni od kroku 1.

### 4. Over, že Keycloak config je v bundle

```bash
ssh aricoma@10.99.99.53 '
  docker run --rm --entrypoint sh abco-fe:latest \
    -c "grep -rq \"http://10.99.99.53:8081\" /usr/share/nginx/html/assets/" \
    && echo "OK: config je v bundle" || echo "CHYBA: config chyba, nenasadzuj"
'
```

Konfigurácia Keycloaku sa zapeká do JS bundle pri builde — nie je to runtime premenná.
Ak tento krok vypíše CHYBA, nasadenie by rozbilo prihlásenie. Vráť sa na krok 2.

### 5. Vymeň kontajner

```bash
ssh aricoma@10.99.99.53 '
  docker rm -f abco-fe || true
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:latest
'
```

Aplikácia je na pár sekúnd nedostupná.

### 6. Over nasadenie

```bash
ssh aricoma@10.99.99.53 '
  sleep 10
  docker ps --filter name=abco-fe --format "{{.Status}}"
  curl -s -o /dev/null -w "app -> %{http_code}\n" http://10.99.99.53:8080/health
  curl -s -o /dev/null -w "keycloak -> %{http_code}\n" \
    http://10.99.99.53:8081/realms/aricoma/.well-known/openid-configuration
'
```

Očakávaný výstup:

```
Up X seconds (healthy)
app -> 200
keycloak -> 200
```

### 7. Preklikaj aplikáciu

Otvor `http://10.99.99.53:8080/` a prihlás sa. Tým je nasadenie hotové.

---

## Rollback

Vráti sa na predchádzajúcu image. Krok 3 tie staršie necháva na serveri pod tagom
s krátkym commit SHA, staršie manuálne buildy môžu mať aj tag `previous`:

```bash
ssh aricoma@10.99.99.53 '
  docker images abco-fe --format "{{.Tag}}\t{{.CreatedSince}}"   # vyber predchádzajúci tag
  docker rm -f abco-fe
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:<tag>
'
```

---

## Keď niečo nefunguje

| Symptóm | Príčina / riešenie |
|---|---|
| Redirect loop na `/undefined/protocol/openid-connect/auth` | Keycloak config sa nedostal do bundle — chýba `.env.production` (krok 2) alebo výnimka `!.env.production` v `.dockerignore` |
| `Invalid parameter: redirect_uri` | v Keycloak klientovi `abcm-fe` chýba `http://10.99.99.53:8080/*` vo *Valid redirect URIs* |
| CORS chyba pri obnove tokenu | v klientovi `abcm-fe` chýba *Web origins* `http://10.99.99.53:8080` |
| `crypto.randomUUID is not a function` | do buildu sa nedostal polyfill z `src/config/keycloak.ts` |
| Kontajner nenaštartuje po `docker load` | arm64 image na x86_64 serveri — buildi na serveri (krok 3), nie lokálne |
| Kontajner beží, ale `app -> 000` | pozri logy: `ssh aricoma@10.99.99.53 'docker logs --tail 50 abco-fe'` |

---

## Jednorazová príprava (už hotové)

**Keycloak klient** v realme `aricoma`: `abcm-fe`, public (client authentication Off),
standard flow, redirect + post logout URIs `http://10.99.99.53:8080/*`,
web origins `http://10.99.99.53:8080`.

**Automatické nasadenie cez GitLab CI** (`.gitlab-ci.yml`, job `build-and-deploy`)
je pripravené, ale k 25. 8. 2026 nemá runner — job ostáva `Pending`. Blokery a postup
na ich odstránenie sú v [ci-runner.md](ci-runner.md).
