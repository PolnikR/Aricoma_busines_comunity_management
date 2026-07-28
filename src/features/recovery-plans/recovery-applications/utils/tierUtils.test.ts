import { describe, it, expect } from 'vitest'
import { generateTierId, isTierIdAvailable, slugify } from './tierUtils'

describe('tierUtils', () => {
  describe('slugify', () => {
    it('converts text to lowercase slug with hyphens', () => {
      expect(slugify('My Tier')).toBe('my_tier')
    })

    it('handles multiple spaces', () => {
      expect(slugify('DB  Cluster')).toBe('db_cluster')
    })

    it('removes special characters', () => {
      expect(slugify('Test@Tier#1')).toBe('test_tier_1')
    })

    it('handles leading/trailing spaces', () => {
      expect(slugify('  Primary DB  ')).toBe('primary_db')
    })

    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('')
    })
  })

  describe('generateTierId', () => {
    it('returns slugified name if not in existingIds', () => {
      expect(generateTierId('My Tier', ['database', 'app'])).toBe('my_tier')
    })

    it('appends counter if slug already exists', () => {
      const existing = ['my_tier', 'my_tier_2']
      expect(generateTierId('My Tier', existing)).toBe('my_tier_3')
    })

    it('returns empty slug + counter if name is empty', () => {
      const existing = ['_1']
      expect(generateTierId('', existing)).toBe('_2')
    })
  })

  describe('isTierIdAvailable', () => {
    it('checks collisions after normalizing the entered ID', () => {
      expect(isTierIdAvailable('DB Cluster', ['database', 'db_cluster'])).toBe(false)
    })

    it('allows the current normalized ID while editing', () => {
      expect(isTierIdAvailable('DB Cluster', ['database', 'db_cluster'], 'db_cluster')).toBe(true)
    })
  })
})
