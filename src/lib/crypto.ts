// CortexOps - Credential Encryption System
// AES-256-GCM encryption for storing sensitive credentials

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set')
  }

  // If key is hex string, convert to buffer
  if (key.length === KEY_LENGTH * 2) {
    return Buffer.from(key, 'hex')
  }

  // If key is a passphrase, derive a key using PBKDF2
  return crypto.pbkdf2Sync(key, 'cortexops-salt', 100000, KEY_LENGTH, 'sha256')
}

export interface EncryptedData {
  iv: string
  encrypted: string
  authTag: string
}

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(data: EncryptedData): string {
  const key = getEncryptionKey()
  const iv = Buffer.from(data.iv, 'hex')
  const authTag = Buffer.from(data.authTag, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypt a credential object (API key, token, etc.)
 */
export function encryptCredential(credential: Record<string, unknown>): string {
  const json = JSON.stringify(credential)
  const encrypted = encrypt(json)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt a credential object
 */
export function decryptCredential(encryptedString: string): Record<string, unknown> {
  const data: EncryptedData = JSON.parse(encryptedString)
  const decrypted = decrypt(data)
  return JSON.parse(decrypted)
}

/**
 * Hash a value for storage (one-way, for API key prefixes, etc.)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `cxk_${crypto.randomBytes(32).toString('hex')}`
  const hash = hashValue(key)
  const prefix = key.substring(0, 8)

  return { key, hash, prefix }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
