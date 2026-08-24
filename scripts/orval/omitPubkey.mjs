const PUBLIC_KEY_PATH = '/credentials/pubkey'

export default function omitCredentialsPublicKey(spec) {
  const paths = { ...(spec.paths ?? {}) }
  delete paths[PUBLIC_KEY_PATH]

  return {
    ...spec,
    paths,
  }
}
