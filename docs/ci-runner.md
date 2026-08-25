# GitLab runner pre abco-fe

Push do `master` nasadí aplikáciu automaticky — job `build-and-deploy` v
[`.gitlab-ci.yml`](../.gitlab-ci.yml) zbehne na runneri priamo na `10.99.99.53`.
Sfunkčnené 25. 8. 2026. [Manuálny postup](deployment.md) ostáva ako záloha, keď
je runner nedostupný.

Runner musí bežať **na tom serveri, kam sa nasadzuje** — job robí `docker run`
na hostiteľovi, takže cudzie runnery (`deploy-minedu`, instance runnery) použiť nejde.

## Čo je nastavené

| Vec | Hodnota |
|---|---|
| Runner | `abco-fe (10.99.99.53)`, project runner v `abco/abco-fe` |
| Tag | `deploy-abco` (bez „run untagged jobs") |
| Executor | `shell` / `bash`, účet `gitlab-runner` |
| Verzia | gitlab-runner 19.3.1, Debian 13 (repo `dist=bookworm`) |
| Konfigurácia | `/etc/gitlab-runner/config.toml` |
| Pracovný adresár | `/home/gitlab-runner/builds/` |
| DNS | `172.20.1.90  git.esas.autocont.sk` v `/etc/hosts` |
| CA | `/usr/local/share/ca-certificates/hqsr-git.crt` |

Server nemá interné DNS ani firemnú CA v truste, preto tie dva posledné riadky.
Bez nich zlyhá `git clone` z GitLabu na `Could not resolve host`, resp.
`unable to get local issuer certificate`.

> Nainštalovaný cert je **leaf cert GitLabu**, nie `HQSR CA` — GitLab neposiela
> chain, takže sa CA nedala vytiahnuť zo spojenia. Funguje to ako pinning na jeden
> konkrétny cert; **pri jeho obnove (platí do 27. 12. 2030) prestane git fungovať**
> a bude ho treba vymeniť. Trvalejšie riešenie je vypýtať si od správcu GitLabu
> skutočný CA cert a nainštalovať ten.

`shell` executor púšťa CI skripty priamo na hostiteľovi pod účtom `gitlab-runner`,
ktorý je v skupine `docker`. Ktokoľvek s právom pushnúť do `master` tým vie spustiť
ľubovoľný príkaz na abco-fe. Pre interný deploy server je to prijateľné, ale je to
vedomý kompromis — job potrebuje hostiteľský Docker.

## Registrácia nanovo

Keď runner zmizne (reinštalácia servera, zmazaný v GitLabe):

```bash
# 1. token: GitLab -> abco/abco-fe -> Settings -> CI/CD -> Runners
#    -> Create project runner -> Linux, tag "deploy-abco", untagged vypnuté
#    Token glrt-... sa zobrazí len raz.

# 2. inštalácia (trixie v GitLab repe nie je, preto bookworm)
curl -sSL "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" \
  | sudo os=debian dist=bookworm bash
sudo apt-get install -y gitlab-runner
sudo usermod -aG docker gitlab-runner

# 3. registrácia
sudo gitlab-runner register --non-interactive \
  --url https://git.esas.autocont.sk \
  --token glrt-xxxxx \
  --executor shell --shell bash \
  --description "abco-fe (10.99.99.53)"

sudo systemctl restart gitlab-runner
sudo gitlab-runner verify        # musí vypísať "is valid"
```

Tagy sa pri `glrt-` tokene nastavujú v GitLabe pri vytváraní runnera, nie
cez `--tag-list`.

## Keď niečo nefunguje

| Symptóm | Príčina / riešenie |
|---|---|
| Job ostáva `Pending` | runner offline (`sudo systemctl status gitlab-runner`), alebo tag joba nesedí s `deploy-abco` |
| `Could not resolve host: git.esas.autocont.sk` | chýba záznam v `/etc/hosts` |
| `unable to get local issuer certificate` | cert nie je v truste alebo bol obnovený — pozri poznámku vyššie |
| `403` pri prístupe na GitLab | Sophos proxy na `10.99.99.1` blokuje `10.99.99.0/24 → GitLab`; treba výnimku `10.99.99.53 → git.esas.autocont.sk:443` |
| `permission denied` na `/var/run/docker.sock` | `gitlab-runner` nie je v skupine `docker`, alebo služba nebola reštartovaná po `usermod` |
| Build prejde, appka je stará | pozri `docker ps --filter name=abco-fe` — image má byť otagovaný commit SHA |

Overenie zvonku, že prostredie je v poriadku:

```bash
ssh aricoma@10.99.99.53 '
  sudo -u gitlab-runner curl -sSI https://git.esas.autocont.sk/ | head -1  # HTTP/2 302
  sudo -u gitlab-runner docker ps --format "{{.Names}}"                    # vidí kontajnery
  sudo gitlab-runner verify
'
```
