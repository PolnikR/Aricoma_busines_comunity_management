export const API_ENDPOINTS = {
  credentials: {
    publicKey: '/api/credentials/pubkey',
    list: '/api/get_credentials',
    submit: '/api/submit_credential',
    delete: '/api/delete_credential',
  },
} as const
