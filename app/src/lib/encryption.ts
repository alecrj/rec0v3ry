/**
 * Field-Level Encryption Utilities
 *
 * AES-256-GCM encryption for Part 2 protected data.
 * Source: docs/04_COMPLIANCE.md Section 5 (Encryption Requirements)
 * Source: docs/02_ARCHITECTURE.md Section 15 (Security Architecture)
 */

import crypto from 'crypto';
import { ENCRYPTION } from './constants';

/**
 * Data encryption key (DEK) cache
 * In production, this would be loaded from AWS KMS per org
 * For now, use environment variable
 */
const DEK_CACHE = new Map<string, Buffer>();

/**
 * Get or generate data encryption key for an organization
 * In production, this retrieves the org-specific key from KMS
 */
async function getDataEncryptionKey(orgId: string): Promise<Buffer> {
  // Check cache first
  if (DEK_CACHE.has(orgId)) {
    return DEK_CACHE.get(orgId)!;
  }

  // In production, fetch from KMS:
  // const kmsKey = await kmsClient.decrypt({ orgId });
  // For development, derive from master key + orgId
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY not configured');
  }

  // Derive org-specific key using HKDF
  const key = crypto.hkdfSync(
    'sha256',
    masterKey,
    orgId,
    'RecoveryOS-DEK',
    ENCRYPTION.KEY_LENGTH
  );

  const keyBuffer = Buffer.from(key);
  DEK_CACHE.set(orgId, keyBuffer);
  return keyBuffer;
}

/**
 * Encrypt a field value using AES-256-GCM
 *
 * @param value - Plaintext value to encrypt
 * @param orgId - Organization ID for key derivation
 * @returns Base64-encoded string: IV || ciphertext || authTag
 */
export async function encryptField(
  value: string,
  orgId: string
): Promise<string> {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  if (!orgId) {
    throw new Error('orgId required for encryption');
  }

  try {
    // Get org-specific encryption key
    const key = await getDataEncryptionKey(orgId);

    // Generate random IV (96 bits for AES-GCM)
    const iv = crypto.randomBytes(ENCRYPTION.IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(
      ENCRYPTION.ALGORITHM,
      key,
      iv
    );

    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV + ciphertext + authTag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Return base64-encoded
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt field');
  }
}

/**
 * Decrypt a field value using AES-256-GCM
 *
 * @param encrypted - Base64-encoded encrypted string
 * @param orgId - Organization ID for key derivation
 * @returns Decrypted plaintext
 */
export async function decryptField(
  encrypted: string,
  orgId: string
): Promise<string> {
  if (!encrypted) {
    throw new Error('Cannot decrypt empty value');
  }

  if (!orgId) {
    throw new Error('orgId required for decryption');
  }

  try {
    // Get org-specific encryption key
    const key = await getDataEncryptionKey(orgId);

    // Decode from base64
    const combined = Buffer.from(encrypted, 'base64');

    // Extract components
    const iv = combined.subarray(0, ENCRYPTION.IV_LENGTH);
    const authTag = combined.subarray(combined.length - ENCRYPTION.AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(
      ENCRYPTION.IV_LENGTH,
      combined.length - ENCRYPTION.AUTH_TAG_LENGTH
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION.ALGORITHM,
      key,
      iv
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(ciphertext as any),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    // This could indicate tampering - log to security monitoring
    throw new Error('Failed to decrypt field - data may be corrupted or tampered');
  }
}

/**
 * Hash a value for comparison (e.g., password hashing)
 * Uses PBKDF2 with salt
 */
export function hashValue(value: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(
    value,
    actualSalt,
    100000,
    64,
    'sha512'
  ).toString('hex');

  return `${actualSalt}:${hash}`;
}

/**
 * Verify a hashed value
 */
export function verifyHash(value: string, hashed: string): boolean {
  const [salt] = hashed.split(':');
  const hashedInput = hashValue(value, salt);
  return crypto.timingSafeEqual(
    Buffer.from(hashed),
    Buffer.from(hashedInput)
  );
}

/**
 * Generate HMAC for hash chain integrity
 * Used in audit logging
 */
export function generateHMAC(
  data: string,
  key: string
): string {
  return crypto
    .createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Generate secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Clear DEK cache (for testing or key rotation)
 */
export function clearDEKCache(orgId?: string): void {
  if (orgId) {
    DEK_CACHE.delete(orgId);
  } else {
    DEK_CACHE.clear();
  }
}
