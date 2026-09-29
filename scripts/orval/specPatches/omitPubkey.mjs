import { definePatch } from './definePatch.mjs'

const PUBLIC_KEY_PATH = '/credentials/pubkey'

// The PEM public key endpoint is fetched directly by credentialsCrypto.ts.
export default definePatch({
  name: 'omitPubkey',
  isObsolete: spec => (spec.paths?.[PUBLIC_KEY_PATH] ? null : `${PUBLIC_KEY_PATH} is no longer in the spec`),
  apply: (spec) => {
    const paths = { ...spec.paths }
    delete paths[PUBLIC_KEY_PATH]
    return { ...spec, paths }
  },
})
