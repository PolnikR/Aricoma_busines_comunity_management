# Manuálne nasadenie abco-fe

Aplikácia beží ako nginx kontajner na `https://abco.aricoma.local:8443` (HTTP `10.99.99.53:8080`
je podľa `TLS_MODE` vypnuté alebo presmeruje na HTTPS), Keycloak na `10.99.99.53:8081`
a prehliadač naň chodí cez proxy `/auth` aplikácie — pozri [TLS](#tls-https).
Build (lint + typecheck + testy) prebieha **na serveri** v Dockeri. Bežne to za teba
spraví CI po pushi do `master` ([ci-runner.md](ci-runner.md)); tento postup je záloha,
keď je runner nedostupný.

**Predpoklad:** funguje `ssh aricoma@10.99.99.53` a zmeny máš commitnuté.

---

## 1. Skopíruj zdrojáky na server

```bash
ROOT=$(git rev-parse --show-toplevel) && rsync -az --delete \
  --exclude node_modules --exclude dist \
  "$ROOT/" aricoma@10.99.99.53:~/abco-fe-src/
```

Takto sa na server dostane aj to, čo ešte nie je v GitLabe. `--delete` drží `~/abco-fe-src/`
ako presnú kópiu repozitára — bez neho by sa lokálne zmazaný alebo premenovaný súbor
na serveri buildoval ďalej. Cesta je odvodená z koreňa repozitára, takže príkaz môžeš
spustiť z ľubovoľného podadresára; mimo repozitára sa vôbec nespustí.

## 2. Zbuilduj a over image

```bash
ssh aricoma@10.99.99.53 'set -e
  cd ~/abco-fe-src
  docker build -t abco-fe:$(git rev-parse --short HEAD) -t abco-fe:latest .
  echo "=== BUILD OK ==="
'
```

Trvá to niekoľko minút. Konfigurácia Keycloaku sa **generuje do `config.js` pri
starte kontajnera** (`envsubst` z `KEYCLOAK_URL`/`KEYCLOAK_REALM`/`KEYCLOAK_CLIENT_ID`),
nie je zapečená v JS bundle — zmenu Keycloaku tak nevyžaduje rebuild image, len
nový `docker run` s inými `-e` premennými.

Pokračuj, len ak posledný riadok je `=== BUILD OK ===`. Čokoľvek iné znamená, že
sa nič nenasadilo a starý kontajner beží ďalej — oprav to lokálne a začni od kroku 1.

## 3. Vymeň kontajner a over

```bash
ssh aricoma@10.99.99.53 '
  docker rm -f abco-fe || true
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 -p 8443:443 \
    -v abco-fe-certs:/etc/nginx/certs \
    -e TLS_MODE=https -e HTTPS_PUBLIC_PORT=8443 \
    -e KEYCLOAK_URL=https://abco.aricoma.local:8443/auth \
    -e KEYCLOAK_INTERNAL_URL=http://10.99.99.53:8081 \
    -e KEYCLOAK_REALM=aricoma \
    -e KEYCLOAK_CLIENT_ID=abcm-fe \
    abco-fe:latest
  sleep 10
  docker ps --filter name=abco-fe --format "{{.Status}}"
  curl -sk -o /dev/null -w "app -> %{http_code}\n" https://127.0.0.1:8443/health
  curl -sk -o /dev/null -w "keycloak -> %{http_code}\n" \
    https://127.0.0.1:8443/auth/realms/aricoma/.well-known/openid-configuration
'
```

Aplikácia je na pár sekúnd nedostupná. Očakávaný výstup:

```
Up X seconds (healthy)
app -> 200
keycloak -> 200
```

## 4. Preklikaj aplikáciu

Otvor `https://abco.aricoma.local:8443/` (pri prvom otvorení potvrď výnimku pre self-signed
certifikát) a prihlás sa. Tým je nasadenie hotové.

---

## Rollback

Krok 2 necháva staršie image na serveri pod tagom s krátkym commit SHA:

```bash
ssh aricoma@10.99.99.53 '
  docker images abco-fe --format "{{.Tag}}\t{{.CreatedSince}}"   # vyber predchádzajúci tag
  docker rm -f abco-fe
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 -p 8443:443 \
    -v abco-fe-certs:/etc/nginx/certs \
    -e TLS_MODE=https -e HTTPS_PUBLIC_PORT=8443 \
    -e KEYCLOAK_URL=https://abco.aricoma.local:8443/auth \
    -e KEYCLOAK_INTERNAL_URL=http://10.99.99.53:8081 \
    -e KEYCLOAK_REALM=aricoma \
    -e KEYCLOAK_CLIENT_ID=abcm-fe \
    abco-fe:<tag>
'
```

---

## Keď niečo nefunguje

| Symptóm | Príčina / riešenie |
|---|---|
| Redirect loop na `/undefined/protocol/openid-connect/auth` | Kontajner nebeží s `KEYCLOAK_URL`/`KEYCLOAK_REALM`/`KEYCLOAK_CLIENT_ID` alebo sa nevygeneroval `config.js` — over `docker exec abco-fe cat /usr/share/nginx/html/config.js` |
| `Invalid parameter: redirect_uri` | v Keycloak klientovi `abcm-fe` chýba `https://abco.aricoma.local:8443/*` vo *Valid redirect URIs* |
| CORS chyba pri obnove tokenu | v klientovi `abcm-fe` chýba *Web origins* `https://abco.aricoma.local:8443` |
| Prehliadač nenájde `abco.aricoma.local` | názov musí ukazovať na `10.99.99.53` (DNS alebo hosts súbor) |
| Login stránka Keycloaku má zlé URL (bez `/auth`) alebo `http://` | Keycloak nemá `KC_HOSTNAME=https://abco.aricoma.local:8443/auth` a `KC_PROXY_HEADERS=xforwarded` |
| `crypto.randomUUID is not a function` | do buildu sa nedostal polyfill z `src/config/keycloak.ts` |
| Kontajner nenaštartuje po `docker load` | arm64 image na x86_64 serveri — buildi na serveri (krok 2), nie lokálne |
| Kontajner beží, ale `app -> 000` | `ssh aricoma@10.99.99.53 'docker logs --tail 50 abco-fe'` |

---

## TLS (HTTPS)

Predvolene aplikácia beží na HTTPS so self-signed certifikátom. Prehliadač pri prvom
otvorení vypýta potvrdenie výnimky — certifikát nie je podpísaný verejnou CA.

| Premenná | Predvolene | Význam |
|---|---|---|
| `TLS_MODE` | `https` | `https` = len 443, `http` = len 80 (bez TLS), `both` = 80 presmeruje na 443 |
| `HTTPS_PUBLIC_PORT` | `8443` | verejný HTTPS port (pre presmerovanie v `both`) |
| `CERT_CN` / `CERT_O` | `Aricoma` | subject certifikátu |
| `CERT_SAN` | `abco.aricoma.local,localhost` | DNS mená v certifikáte (len DNS, bez IP) |
| `CERT_DAYS` | `730` | platnosť pri generovaní |
| `KEYCLOAK_INTERNAL_URL` | `http://10.99.99.53:8081` | kam nginx preposiela `/auth/` |

**Certifikát sa generuje len raz** — pri prvom štarte, ak v `/etc/nginx/certs` (volume
`abco-fe-certs`) chýba. Reštart ani nové nasadenie ho nemení; volume musí ostať, inak sa
vygeneruje nový. Dátum expirácie sa loguje pri každom štarte a 30 dní vopred aj varuje.
**Obnova / zmena CN, SAN:** `docker rm -f abco-fe && docker volume rm abco-fe-certs`
a nasadiť znova (prehliadač znova vypýta výnimku).

**Keycloak:** HTTPS stránka nesmie volať HTTP Keycloak (mixed content), preto nginx
preposiela `/auth/` na `KEYCLOAK_INTERNAL_URL` a `KEYCLOAK_URL` ukazuje na
`https://abco.aricoma.local:8443/auth` — jeden origin, jeden certifikát. Na strane Keycloaku:
- klient `abcm-fe`: redirect + post logout URIs `https://abco.aricoma.local:8443/*`,
  web origins `https://abco.aricoma.local:8443`,
- server: `KC_HOSTNAME=https://abco.aricoma.local:8443/auth`, `KC_PROXY_HEADERS=xforwarded`
  (`KC_HTTP_RELATIVE_PATH` nenastavovať — nginx prefix `/auth` odreže).

Pre starý HTTP režim: `TLS_MODE=http`, `KEYCLOAK_URL=http://10.99.99.53:8081`.

Test režimov a perzistencie certifikátu (potrebuje bežiaci Docker):
`bash docker/tls-smoke-test.sh`.

---

## Jednorazová príprava (už hotové)

**Keycloak klient** v realme `aricoma`: `abcm-fe`, public (client authentication Off),
standard flow, redirect + post logout URIs `http://10.99.99.53:8080/*`,
web origins `http://10.99.99.53:8080`.

**Automatické nasadenie cez GitLab CI** (`.gitlab-ci.yml`, job `build-and-deploy`)
beží od 25. 8. 2026 na runneri `abco-fe (10.99.99.53)`. Detaily v [ci-runner.md](ci-runner.md).