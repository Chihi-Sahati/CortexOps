// CortexOps - Crypto Module Tests
import { encrypt, decrypt, hashValue, generateApiKey } from '../crypto'

// Set up encryption key for tests
beforeAll(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex
})

describe('Crypto Module', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const plaintext = 'secret-api-key-12345'
      const encrypted = encrypt(plaintext)

      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('authTag')
      expect(encrypted.encrypted).not.toBe(plaintext)

      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'same-secret'
      const encrypted1 = encrypt(plaintext)
      const encrypted2 = encrypt(plaintext)

      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted)
    })
  })

  describe('hashValue', () => {
    it('should produce consistent hashes', () => {
      const value = 'test-value'
      const hash1 = hashValue(value)
      const hash2 = hashValue(value)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex
    })
  })

  describe('generateApiKey', () => {
    it('should generate API keys with correct format', () => {
      const { key, hash, prefix } = generateApiKey()

      expect(key).toMatch(/^cxk_[a-f0-9]{64}$/)
      expect(hash).toHaveLength(64)
      expect(prefix).toHaveLength(8)
      expect(key.startsWith(prefix)).toBeTruthy()
    })
  })
})
