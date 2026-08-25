# Manuálne nasadenie abco-fe

Aplikácia beží ako nginx kontajner na `10.99.99.53:8080`, Keycloak na `10.99.99.53:8081`.
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
  grep -q "VITE_KEYCLOAK_URL=http://10.99.99.53:8081" .env.production \
    || { echo "CHYBA: .env.production nesedí"; exit 1; }
  docker build -t abco-fe:$(git rev-parse --short HEAD) -t abco-fe:latest .
  docker run --rm --entrypoint sh abco-fe:latest \
    -c "grep -rq \"http://10.99.99.53:8081\" /usr/share/nginx/html/assets/" \
    || { echo "CHYBA: Keycloak config nie je v bundle"; exit 1; }
  echo "=== BUILD OK ==="
'
```

Trvá to niekoľko minút. Konfigurácia Keycloaku sa **zapeká do JS bundle pri builde**,
nie je to runtime premenná — preto tá kontrola pred aj po builde; bez nej skončí
aplikácia v redirect loope.

Pokračuj, len ak posledný riadok je `=== BUILD OK ===`. Čokoľvek iné znamená, že
sa nič nenasadilo a starý kontajner beží ďalej — oprav to lokálne a začni od kroku 1.

## 3. Vymeň kontajner a over

```bash
ssh aricoma@10.99.99.53 '
  docker rm -f abco-fe || true
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:latest
  sleep 10
  docker ps --filter name=abco-fe --format "{{.Status}}"
  curl -s -o /dev/null -w "app -> %{http_code}\n" http://10.99.99.53:8080/health
  curl -s -o /dev/null -w "keycloak -> %{http_code}\n" \
    http://10.99.99.53:8081/realms/aricoma/.well-known/openid-configuration
'
```

Aplikácia je na pár sekúnd nedostupná. Očakávaný výstup:

```
Up X seconds (healthy)
app -> 200
keycloak -> 200
```

## 4. Preklikaj aplikáciu

Otvor `http://10.99.99.53:8080/` a prihlás sa. Tým je nasadenie hotové.

---

## Rollback

Krok 2 necháva staršie image na serveri pod tagom s krátkym commit SHA:

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
| Redirect loop na `/undefined/protocol/openid-connect/auth` | Keycloak config sa nedostal do bundle — chýba `.env.production` alebo výnimka `!.env.production` v `.dockerignore` |
| `Invalid parameter: redirect_uri` | v Keycloak klientovi `abcm-fe` chýba `http://10.99.99.53:8080/*` vo *Valid redirect URIs* |
| CORS chyba pri obnove tokenu | v klientovi `abcm-fe` chýba *Web origins* `http://10.99.99.53:8080` |
| `crypto.randomUUID is not a function` | do buildu sa nedostal polyfill z `src/config/keycloak.ts` |
| Kontajner nenaštartuje po `docker load` | arm64 image na x86_64 serveri — buildi na serveri (krok 2), nie lokálne |
| Kontajner beží, ale `app -> 000` | `ssh aricoma@10.99.99.53 'docker logs --tail 50 abco-fe'` |

---

## Jednorazová príprava (už hotové)

**Keycloak klient** v realme `aricoma`: `abcm-fe`, public (client authentication Off),
standard flow, redirect + post logout URIs `http://10.99.99.53:8080/*`,
web origins `http://10.99.99.53:8080`.

**Automatické nasadenie cez GitLab CI** (`.gitlab-ci.yml`, job `build-and-deploy`)
beží od 25. 8. 2026 na runneri `abco-fe (10.99.99.53)`. Detaily v [ci-runner.md](ci-runner.md).