# Nasadenie abco-fe

Cieľový server: `10.99.99.53` (user `aricoma`), aplikácia beží na porte `8080`,
Keycloak na porte `8081`.

## Ako to funguje

Aplikácia je statický Vite build servírovaný nginxom v Docker kontajneri.
Keycloak konfigurácia (`VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`,
`VITE_KEYCLOAK_CLIENT_ID`) sa **zapeká do bundle v čase buildu** — nie je to
runtime premenná. Zmena Keycloak nastavení preto vždy vyžaduje nový build
a nasadenie novej image.

Dôsledok: `.env.production` musí byť v Docker build kontexte. `.dockerignore`
vylučuje `.env.*`, preto obsahuje výnimku `!.env.production`. Bez nej sa
vybuilduje `new Keycloak({url: undefined, realm: undefined, clientId: undefined})`
a aplikácia skončí v rekurzívnom redirect loope na
`/undefined/protocol/openid-connect/auth`.

## Jednorazové kroky

### 1. Keycloak klient

V realme `aricoma` musí existovať klient `abcm-fe` s týmto nastavením:

| Položka | Hodnota |
|---|---|
| Client ID | `abcm-fe` |
| Client authentication | Off (public client) |
| Standard flow | Enabled |
| Valid redirect URIs | `http://10.99.99.53:8080/*` |
| Valid post logout redirect URIs | `http://10.99.99.53:8080/*` |
| Web origins | `http://10.99.99.53:8080` |

Bez `Web origins` zlyhá tichá obnova tokenu na CORS, bez `redirect URIs`
Keycloak odmietne login s `Invalid parameter: redirect_uri`.

### 2. GitLab runner na serveri (pre automatické nasadenie)

CI pipeline používa **shell executor bežiaci priamo na `10.99.99.53`** —
buildí a spúšťa Docker lokálne, nič sa neprenáša cez registry. Runner musí byť
zaregistrovaný s tagom `deploy-abco` (ten istý tag je v `.gitlab-ci.yml`).

```bash
# na 10.99.99.53
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | sudo bash
sudo apt-get install -y gitlab-runner

sudo gitlab-runner register \
  --non-interactive \
  --url "https://git.esas.autocont.sk/" \
  --token "<registration-token zo Settings > CI/CD > Runners>" \
  --executor "shell" \
  --description "abco-deploy" \
  --tag-list "deploy-abco"

# runner potrebuje pristup k Dockeru
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

> **Pozor — DNS.** Server aktuálne nevie preložiť `git.esas.autocont.sk`
> (`getent hosts git.esas.autocont.sk` zlyhá), hoci má funkčný výstup do
> internetu. Runner sa bez toho nepripojí na GitLab. Treba buď doplniť interný
> DNS resolver, alebo pridať záznam do `/etc/hosts`:
>
> ```bash
> echo "172.20.1.90  git.esas.autocont.sk" | sudo tee -a /etc/hosts
> ```
>
> Overenie: `curl -sI https://git.esas.autocont.sk/ | head -1`

### 3. CI/CD premenné

Predvolené hodnoty sú v `variables:` bloku `.gitlab-ci.yml` a fungujú pre
existujúce prostredie. Ak treba mieriť na iný Keycloak, prepíš ich v
**Settings → CI/CD → Variables**: `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`,
`VITE_KEYCLOAK_CLIENT_ID`.

## Automatické nasadenie

Push do `master` spustí pipeline sám. Na ostatných vetvách je job manuálny
(spustíš ho tlačidlom v **CI/CD → Pipelines**).

Pipeline robí:

1. **build-and-deploy** — vygeneruje `.env.production` z CI premenných, overí že
   nie sú prázdne, `docker build`, overí že sa Keycloak hodnoty naozaj dostali
   do bundle, vymení kontajner, zmaže staré image (ponechá 5 najnovších).
2. **verify_deploy** — počká 10 s, skontroluje `HTTP 200` na `/health`, overí
   Keycloak config v nasadenom bundle a dostupnosť realmu.

## Manuálne nasadenie

### Variant A — build priamo na serveri (odporúčaný)

Zhodný s tým, čo robí CI, a nemá problém s architektúrou.

```bash
# 1. dostať zdrojáky na server (server nevidí GitLab, preto rsync z lokálu)
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git \
  -e "ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes" \
  "/Users/melis/Aricoma/ABC Orchestracia/abco-fe/" \
  aricoma@10.99.99.53:~/abco-fe-src/

# 2. na serveri
ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53
cd ~/abco-fe-src

# 3. skontrolovať Keycloak konfiguráciu, ktorá sa zapečie
cat .env.production
# VITE_KEYCLOAK_URL=http://10.99.99.53:8081
# VITE_KEYCLOAK_REALM=aricoma
# VITE_KEYCLOAK_CLIENT_ID=abcm-fe

# 4. build (spusti lint + typecheck + testy, potom vite build)
docker build -t abco-fe:latest .

# 5. overiť, ze sa config zapiekol — NEPRESKAKOVAT
docker run --rm --entrypoint sh abco-fe:latest \
  -c "grep -roE 'url:.{0,30}realm:.{0,12}clientId:.{0,12}' /usr/share/nginx/html/assets/ | head -1"
# musí vypísať reálne hodnoty, nie `url:void 0`

# 6. výmena kontajnera
docker stop abco-fe || true
docker rm abco-fe || true
docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:latest
```

### Variant B — build na Macu, prenos cez tar

Použi, len ak sa nedá buildovať na serveri.

> **Architektúra.** Server je `x86_64`. Apple Silicon vybuildí `arm64` image,
> ktorý sa na serveri načíta, ale nespustí. Preto je `--platform linux/amd64`
> povinný.

```bash
cd "/Users/melis/Aricoma/ABC Orchestracia/abco-fe"

docker build --platform linux/amd64 -t abco-fe:latest .
docker image inspect abco-fe:latest --format '{{.Os}}/{{.Architecture}}'   # linux/amd64

docker save abco-fe:latest -o /tmp/abco-fe.tar
scp -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes /tmp/abco-fe.tar aricoma@10.99.99.53:~/abco-fe.tar

ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53 '
  docker load -i ~/abco-fe.tar
  docker rm -f abco-fe || true
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:latest
'
```

## Overenie po nasadení

```bash
ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53 '
  docker ps --filter name=abco-fe --format "{{.Status}}\t{{.Ports}}"
  curl -s -o /dev/null -w "app /health -> %{http_code}\n" http://10.99.99.53:8080/health
  curl -s -o /dev/null -w "keycloak realm -> %{http_code}\n" \
    http://10.99.99.53:8081/realms/aricoma/.well-known/openid-configuration
  docker exec abco-fe sh -c "grep -rq \"http://10.99.99.53:8081\" /usr/share/nginx/html/assets/" \
    && echo "keycloak config v bundle: OK"
'
```

Očakávané: kontajner `Up (healthy)`, obe HTTP `200`, config `OK`. Nakoniec
otvor `http://10.99.99.53:8080/` a preklikaj login.

## Rollback

Image sú tagované commit SHA, na serveri sa drží posledných 5.

```bash
ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53 '
  docker images abco-fe --format "{{.Tag}}\t{{.CreatedAt}}"
  docker rm -f abco-fe
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:<predchadzajuci-tag>
'
```

## Riešenie problémov

**Redirect loop na `/undefined/protocol/openid-connect/auth`** — do bundle sa
nedostala Keycloak konfigurácia. Skontroluj, že `.dockerignore` má
`!.env.production` a že `.env.production` existuje v build kontexte. Potvrdíš to
príkazom z kroku 5 vyššie: ak vidíš `url:void 0`, je to ono.

**`Invalid parameter: redirect_uri`** — chýba `http://10.99.99.53:8080/*`
v `Valid redirect URIs` klienta `abcm-fe`.

**Kontajner sa nespustí po `docker load`** — nesúlad architektúry, pozri
variant B.

**Login zlyhá na `crypto.randomUUID is not a function`** — beží sa cez plain
HTTP, kde nie je secure context. Polyfill je v `src/config/keycloak.ts`; ak sa
chyba vráti, znamená to, že sa tento súbor nedostal do buildu.
