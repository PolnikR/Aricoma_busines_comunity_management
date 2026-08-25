# Nasadenie abco-fe

Server `10.99.99.53` (user `aricoma`), aplikácia na porte `8080`, Keycloak na `8081`.
Statický Vite build v nginx kontajneri. Buildí sa **priamo na serveri** — CI runner
zatiaľ neexistuje (dôvody nižšie), takže manuálny postup je jediná cesta.

## Manuálne nasadenie

```bash
# 1. zdrojáky na server — spusti z koreňa repozitára (server nevidí GitLab)
rsync -az --delete \
  --exclude node_modules --exclude dist \
  -e "ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes" \
  ./ aricoma@10.99.99.53:~/abco-fe-src/

# 2. build a výmena kontajnera
ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53 '
  cd ~/abco-fe-src
  cat .env.production                 # musí mať VITE_KEYCLOAK_URL/REALM/CLIENT_ID
  docker build -t abco-fe:latest .    # spustí aj lint + typecheck + testy
  docker rm -f abco-fe || true
  docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:latest
'

# 3. overenie
ssh -i ~/.ssh/id_ed25519 aricoma@10.99.99.53 '
  docker ps --filter name=abco-fe --format "{{.Status}}"
  curl -s -o /dev/null -w "app -> %{http_code}\n" http://10.99.99.53:8080/health
  docker exec abco-fe grep -rq "http://10.99.99.53:8081" /usr/share/nginx/html/assets/ \
    && echo "keycloak config v bundle: OK"
'
```

Očakávané: `Up (healthy)`, `app -> 200`, `config: OK`. Nakoniec otvor
`http://10.99.99.53:8080/` a preklikaj login.

**Rollback:** image sú tagované commit SHA, drží sa posledných 5.
`docker rm -f abco-fe && docker run -d --name abco-fe --restart unless-stopped -p 8080:80 abco-fe:<tag>`

## Čo sa najčastejšie pokazí

| Symptóm | Príčina |
|---|---|
| Redirect loop na `/undefined/protocol/openid-connect/auth` | Keycloak config sa nedostal do bundle — chýba `.env.production` v build kontexte alebo `!.env.production` v `.dockerignore` |
| `Invalid parameter: redirect_uri` | v klientovi `abcm-fe` chýba `http://10.99.99.53:8080/*` v *Valid redirect URIs* |
| CORS chyba pri obnove tokenu | v klientovi chýba *Web origins* `http://10.99.99.53:8080` |
| Kontajner sa nespustí po `docker load` | arm64 image na x86_64 serveri — buildi na serveri, alebo pridaj `--platform linux/amd64` |
| `crypto.randomUUID is not a function` | do buildu sa nedostal polyfill z `src/config/keycloak.ts` |

Keycloak konfigurácia sa **zapeká do bundle pri builde**, nie je runtime premenná —
každá jej zmena vyžaduje nový build a novú image.

## Jednorazové kroky

**Keycloak klient** v realme `aricoma`: `abcm-fe`, public (client authentication Off),
standard flow, redirect + post logout URIs `http://10.99.99.53:8080/*`,
web origins `http://10.99.99.53:8080`.

**GitLab runner** (pre automatické nasadenie push-om do `master`) — shell executor na
`10.99.99.53` s tagom `deploy-abco`. K 25. 8. 2026 neexistuje, job `build-and-deploy`
ostáva `Pending`. Blokery, v tomto poradí:

1. **Sophos proxy na `10.99.99.1` blokuje `10.99.99.0/24 → GitLab`** (vracia `403`
   s MITM certifikátom). Treba výnimku `10.99.99.53 → git.esas.autocont.sk:443`.
   Z Macu ten istý GitLab funguje, čiže ide o firewall pravidlo.
2. **DNS** — server má len `1.1.1.1`/`8.8.8.8`, interné záznamy nepozná:
   `echo "172.20.1.90  git.esas.autocont.sk" | sudo tee -a /etc/hosts`
3. **CA** — GitLab certifikát vydala `HQSR CA`, ktorá nie je v truste Debianu.
   Chain vytiahni `openssl s_client -connect git.esas.autocont.sk:443 -showcerts`
   zo stroja, ktorý na GitLab dosiahne, nahraj do
   `/usr/local/share/ca-certificates/` a spusti `sudo update-ca-certificates`.

Až keď `curl -sI https://git.esas.autocont.sk/` na serveri vráti `200`/`302`, má zmysel
`gitlab-runner register --executor shell --tag-list deploy-abco` (+ `usermod -aG docker
gitlab-runner`). Kroky 2, 3 aj inštalácia potrebujú `sudo`, ktoré na účte `aricoma`
chce heslo.
