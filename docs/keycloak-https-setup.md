# Keycloak setup for the abco-fe HTTPS deployment

Instructions for an agent (or engineer) with access to the Keycloak server. Read this file, then
make the Keycloak side match the target state below. The frontend side is already done
(see `docs/deployment.md`, section "TLS (HTTPS)").

## Context

- abco-fe is served by nginx at `https://abco.aricoma.local:8443` with a self-signed certificate.
- nginx proxies `https://abco.aricoma.local:8443/auth/*` to Keycloak at `http://10.99.99.53:8081/*`.
  The `/auth` prefix is **stripped** by nginx, so Keycloak itself serves from `/`.
- The browser only ever talks to the app origin; Keycloak stays plain HTTP behind nginx.
- Realm: `aricoma`. Public client: `abcm-fe` (client authentication Off, standard flow, PKCE).
- `abco.aricoma.local` must resolve to `10.99.99.53` (DNS or hosts file).

## Target state

### 1. Keycloak server (Keycloak 25+ options)

| Setting | Value | Why |
|---|---|---|
| `KC_HOSTNAME` | `https://abco.aricoma.local:8443/auth` | Public URL, including the `/auth` path, used in tokens (`iss`), redirects and the discovery document |
| `KC_PROXY_HEADERS` | `xforwarded` | Trust `X-Forwarded-*` headers set by nginx |
| `KC_HTTP_ENABLED` | `true` | Keycloak listens on plain HTTP `:8081` behind nginx |
| `KC_HTTP_RELATIVE_PATH` | **unset** | nginx already strips `/auth`; setting it would double the prefix |
| `KC_HOSTNAME_STRICT` | default | Leave as is |

Apply as env vars or `keycloak.conf` equivalents (`hostname`, `proxy-headers`, `http-enabled`),
then restart Keycloak.

### 2. Client `abcm-fe` in realm `aricoma`

| Field | Value |
|---|---|
| Valid redirect URIs | `https://abco.aricoma.local:8443/*` |
| Valid post logout redirect URIs | `https://abco.aricoma.local:8443/*` |
| Web origins | `https://abco.aricoma.local:8443` |
| Client authentication | Off (public client) |
| Standard flow | On |
| PKCE method | `S256` |

Keep the old `http://10.99.99.53:8080/*` entries only while `TLS_MODE=http` or `both` is still
needed; remove them once HTTP is retired.

### 3. Do not change

- Realm name, client ID, roles, users, groups.
- The frontend's `KEYCLOAK_URL` (`https://abco.aricoma.local:8443/auth`), `KEYCLOAK_REALM`,
  `KEYCLOAK_CLIENT_ID` (set at container start, see deployment docs).

## Verification

Run from any machine that resolves `abco.aricoma.local`; `-k` because the certificate is self-signed.

1. Discovery document is reachable through the app and advertises the public URL:
   ```bash
   curl -sk https://abco.aricoma.local:8443/auth/realms/aricoma/.well-known/openid-configuration \
     | grep -E '"(issuer|authorization_endpoint|token_endpoint)"'
   ```
   Expected: every URL starts with `https://abco.aricoma.local:8443/auth/realms/aricoma`.
   Any `http://` or missing `/auth` means `KC_HOSTNAME` / `KC_PROXY_HEADERS` are wrong.
2. Direct Keycloak still answers: `curl -s -o /dev/null -w "%{http_code}\n" http://10.99.99.53:8081/realms/aricoma/.well-known/openid-configuration` returns `200`.
3. Login in the browser at `https://abco.aricoma.local:8443/`:
   accept the self-signed certificate warning once, get redirected to Keycloak, sign in, land back in the app.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Invalid parameter: redirect_uri` | Redirect URI missing in client `abcm-fe` (step 2) |
| CORS error on token request | Web origin missing in client `abcm-fe` (step 2) |
| Discovery URLs contain `http://` or no `/auth` | `KC_HOSTNAME` not set to the full public URL, or `KC_PROXY_HEADERS` missing |
| Login page assets 404 | `KC_HTTP_RELATIVE_PATH` was set; unset it |
| Token validation fails in the backend (`iss` mismatch) | Backend must trust issuer `https://abco.aricoma.local:8443/auth/realms/aricoma` |
| Browser cannot reach `abco.aricoma.local` | Name does not resolve to `10.99.99.53` |

## Report back

When done, state: which settings were changed (old -> new), the three verification results, and
anything that deviated from this document.
