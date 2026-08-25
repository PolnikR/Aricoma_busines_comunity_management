# GitLab runner pre abco-fe

Pre automatické nasadenie push-om do `master` (job `build-and-deploy` v `.gitlab-ci.yml`)
treba shell executor na `10.99.99.53` s tagom `deploy-abco`. K 25. 8. 2026 neexistuje,
job ostáva `Pending`. Do vtedy platí [manuálny postup](deployment.md).

Blokery, v tomto poradí:

1. **Sophos proxy na `10.99.99.1` blokuje `10.99.99.0/24 → GitLab`** (vracia `403`
   s MITM certifikátom). Treba výnimku `10.99.99.53 → git.esas.autocont.sk:443`.
   Z Macu ten istý GitLab funguje, čiže ide o firewall pravidlo.
2. **DNS** — server má len `1.1.1.1`/`8.8.8.8`, interné záznamy nepozná:
   `echo "172.20.1.90  git.esas.autocont.sk" | sudo tee -a /etc/hosts`
3. **CA** — GitLab certifikát vydala `HQSR CA`, ktorá nie je v truste Debianu.
   Chain vytiahni cez `openssl s_client -connect git.esas.autocont.sk:443 -showcerts`
   zo stroja, ktorý na GitLab dosiahne, nahraj do
   `/usr/local/share/ca-certificates/` a spusti `sudo update-ca-certificates`.

Až keď `curl -sI https://git.esas.autocont.sk/` na serveri vráti `200`/`302`, má zmysel
`gitlab-runner register --executor shell --tag-list deploy-abco`
(+ `usermod -aG docker gitlab-runner`).

Kroky 2, 3 aj samotná inštalácia potrebujú `sudo`, ktoré na účte `aricoma` chce heslo.
