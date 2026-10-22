import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

it('explains successful deletion with a failed list refresh in every language', () => {
  for (const catalog of [en, sk, cs]) {
    for (const key of ['postDeleteRefresh.title', 'postDeleteRefresh.description']) {
      const text = (catalog as Record<string, string>)[key]
      expect(text?.trim(), key).toBeTruthy()
      expect(text?.match(/\{\{\w+\}\}/g) ?? []).toEqual(((en as Record<string, string>)[key] ?? '').match(/\{\{\w+\}\}/g) ?? [])
    }
  }
})
