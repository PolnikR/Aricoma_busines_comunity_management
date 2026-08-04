# Provider Credentials — Initial Frontend Design

## Scope

Replace the Credentials placeholder under Providers & Connectors with a real
feature that lists credential metadata and supports create/upsert and delete.
Passwords are write-only and are never rendered, cached, logged, or persisted
by the frontend.

## Security flow

Before `POST /submit_credential`, the frontend fetches
`GET /credentials/pubkey`, imports the PEM public key with Web Crypto, and
encrypts the password using RSA-OAEP with SHA-256. The submit request always
contains `password_encrypted: true`. There is no plaintext fallback: if Web
Crypto, the public key, or encryption fails, the request is not sent.

The public key may be cached in memory for the current page lifetime. The
plaintext password exists only in the create modal's React state and is cleared
when that modal closes.

## Structure

The feature lives in `src/features/providers-connectors/credentials` and uses
the same `api`, `components`, `model`, and `pages` boundaries as the providers
feature. React Query owns server metadata and invalidates or replaces the list
after mutations.

## API contract

- `GET /get_credentials` returns `{ credentials: CredentialRecord[] }`.
- `GET /credentials/pubkey` returns a PEM public key.
- `POST /submit_credential` accepts the encrypted payload and returns the
  updated credentials list.
- `DELETE /delete_credential?credential_id=...` returns the updated list.
- Credential responses never contain a password.

## UI

The page follows the existing Providers table layout. It has a toolbar, create
button, loading/error/empty states, searchable metadata table, and a guarded
delete action. The create modal validates all required fields and exposes a
clear encryption error without leaking the password.

## Testing

Tests cover API parsing and payloads, mandatory encryption, failure without
Web Crypto/public key, mutation cache updates, form validation, and the page
route replacing the placeholder.
