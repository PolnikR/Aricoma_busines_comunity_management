# Credentials Management — Frontend Integration Guide

For the team building the React frontend against the ABCo API. This covers the
4 credentials endpoints, how to map a credential onto a provider, and how (and
when) to encrypt the password client-side before submitting it.

## Endpoints

All requests need the `X-User: <username>` header (same as every other
endpoint in this API — currently `X-User: admin` works for everything).

| Method | Path | Permission needed | Notes |
|---|---|---|---|
| GET | `/get_credentials` | `view_credentials` | Returns metadata only — **never** a password. |
| POST | `/submit_credential` | `manage_credentials` | Create or update (same `id` = update). |
| DELETE | `/delete_credential?credential_id=` | `manage_credentials` | 409 if a provider still references it. |
| GET | `/credentials/pubkey` | none | Public key (PEM), used for client-side encryption. |

### `GET /get_credentials`

```json
{
  "credentials": [
    { "id": "vcenter-admin", "name": "vCenter Admin", "description": "...", "username": "administrator@vsphere.local" }
  ]
}
```

No `password` field ever appears here or in any other response — passwords are
write-only from the frontend's perspective.

### `POST /submit_credential`

Request body:

```json
{
  "id": "vcenter-admin",
  "name": "vCenter Admin",
  "description": "Production vCenter service account",
  "username": "administrator@vsphere.local",
  "password": "<plaintext OR RSA-encrypted, see below>",
  "password_encrypted": false
}
```

- `id` is stable — POSTing the same `id` again updates that credential (upsert, not append).
- `password_encrypted` tells the backend how to interpret `password`:
  - `false` (default) — `password` is plaintext.
  - `true` — `password` is RSA-OAEP ciphertext, base64-encoded (see the encryption section below).
- Response is the same shape as `GET /get_credentials` (the full updated list, no passwords).

### `DELETE /delete_credential?credential_id=vcenter-admin`

- `200` — deleted, response is the updated `GET /get_credentials`-shaped list.
- `404` — no credential with that id.
- `409` — a provider still has `credentialId` set to this id. The `detail` field names which provider(s) are blocking it — show that to the user (they need to unmap or delete those providers first).

### `GET /credentials/pubkey`

Returns the RSA public key as a PEM string (`Content-Type: application/x-pem-file`), e.g.:

```
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----
```

## Mapping a credential onto a provider

Providers (`GET /get_providers`, `POST /submit_provider`) have an optional
`credentialId` field pointing at a credential's `id`. Each provider also comes
back annotated with `credentialStatus`:

```json
{ "id": "vmware-vcenter-01", "type": "VMWARE", "credentialId": "vcenter-admin", "credentialStatus": "ok" }
```

`credentialStatus` is one of:
- `"ok"` — `credentialId` is set and resolves to a real credential.
- `"missing"` — `credentialId` is set but that credential no longer exists. Show a warning — this provider will fail at request time until re-mapped.
- `"none"` — no `credentialId` set yet.

To map/change a provider's credential, `POST /submit_provider` with the full
provider object including the `credentialId` you want.

## Encrypting the password (optional, recommended)

The API is plain HTTP today (no TLS in front of it yet), so a plaintext
password in the request body is only as safe as the network it crosses.
`password_encrypted: true` adds a layer of protection against **passive**
network sniffing (not against an active man-in-the-middle — that requires real
TLS, which is planned separately). Use it whenever you can; fall back to
plaintext only when the browser can't do it (see the gotcha below).

### The pattern

1. Fetch the public key once (it doesn't change — cache it in memory).
2. Import it as a Web Crypto `CryptoKey`.
3. Encrypt the password with RSA-OAEP / SHA-256.
4. Base64-encode the ciphertext and send it as `password` with `password_encrypted: true`.

```js
// credentialsCrypto.js — no new dependency, native browser Web Crypto API
let cachedPublicKey = null;

async function getPublicKey(apiBase) {
  if (cachedPublicKey) return cachedPublicKey;

  const pem = await (await fetch(`${apiBase}/credentials/pubkey`)).text();
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  cachedPublicKey = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  return cachedPublicKey;
}

export async function encryptPassword(apiBase, password) {
  const key = await getPublicKey(apiBase);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(password)
  );
  return btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
}

export function canEncrypt() {
  return !!(window.crypto && window.crypto.subtle);
}
```

```js
// credentialsApi.js
import { encryptPassword, canEncrypt } from './credentialsCrypto';

export async function submitCredential(apiBase, { id, name, description, username, password }) {
  const encrypted = canEncrypt();
  const payload = {
    id,
    name,
    description,
    username,
    password: encrypted ? await encryptPassword(apiBase, password) : password,
    password_encrypted: encrypted,
  };

  const res = await fetch(`${apiBase}/submit_credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User': 'admin' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function deleteCredential(apiBase, credentialId) {
  const res = await fetch(`${apiBase}/delete_credential?credential_id=${encodeURIComponent(credentialId)}`, {
    method: 'DELETE',
    headers: { 'X-User': 'admin' },
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function getCredentials(apiBase) {
  const res = await fetch(`${apiBase}/get_credentials`, { headers: { 'X-User': 'admin' } });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}
```

### ⚠️ The gotcha: `crypto.subtle` needs a secure context

`crypto.subtle` only exists when the page itself is served over **HTTPS or
`localhost`**. If this app is served over plain `http://` on an internal IP
(common for internal tools like this one), `window.crypto.subtle` is
`undefined` and `encryptPassword` will throw immediately — this has nothing to
do with the API being HTTP, it's about how the *frontend page* is served.

`canEncrypt()` above feature-detects this so `submitCredential` degrades to
plaintext automatically rather than crashing. That's an acceptable interim
fallback (matches the API's own default), but the real fix is serving the
frontend over HTTPS (even a self-signed internal cert) once that's set up.

## Example form component

```jsx
import { useState } from 'react';
import { submitCredential } from './credentialsApi';

export function CredentialForm({ apiBase, onSaved }) {
  const [form, setForm] = useState({ id: '', name: '', description: '', username: '', password: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await submitCredential(apiBase, form);
      onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="id" value={form.id} onChange={update('id')} required />
      <input placeholder="name" value={form.name} onChange={update('name')} required />
      <input placeholder="description" value={form.description} onChange={update('description')} />
      <input placeholder="username" value={form.username} onChange={update('username')} required />
      <input placeholder="password" type="password" value={form.password} onChange={update('password')} required />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save credential'}</button>
    </form>
  );
}
```

## Error handling summary

| Status | When | What to show |
|---|---|---|
| 400 | Malformed request, or a provider has no `credentialId` mapped | The `detail` message directly |
| 403 | Current user lacks `view_credentials`/`manage_credentials` | "You don't have permission to do this" |
| 404 | Unknown credential id | "Credential not found" |
| 409 | Deleting a credential that's still mapped to a provider | Show which provider(s) from `detail`, prompt to unmap first |

## Related: `X-User` and JWT

Auth is currently a raw `X-User: <username>` header — no login flow yet. A JWT
swap is planned server-side but won't change any of the request/response
shapes documented here, so this integration should be forward-compatible.
