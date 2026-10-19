const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VAULT_KEY_PATH = path.join(__dirname, '.vault_key');
const ALGORITHM = 'aes-256-gcm';

/**
 * Derives a 32-byte key for AES-256 from environment or persistent local seed
 */
function getMasterKey() {
  const envSecret = process.env.APP_SECRET || process.env.JWT_SECRET || '';
  if (envSecret && envSecret.length >= 8) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }

  // Persistent machine key on disk (fallback)
  if (fs.existsSync(VAULT_KEY_PATH)) {
    try {
      const raw = fs.readFileSync(VAULT_KEY_PATH, 'utf8').trim();
      if (raw.length === 64) {
        return Buffer.from(raw, 'hex');
      }
    } catch (e) {}
  }

  // Generate persistent 32-byte key
  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(VAULT_KEY_PATH, newKey.toString('hex'), 'utf8');
  } catch (e) {}
  return newKey;
}

/**
 * Encrypt a plaintext secret string using AES-256-GCM
 * @param {string} plaintext
 * @returns {string} format "enc:v1:<iv_hex>:<tag_hex>:<cipher_hex>"
 */
function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  const str = plaintext.trim();
  if (!str) return '';
  if (str.startsWith('enc:v1:')) return str; // already encrypted

  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted secret or return plaintext if not encrypted
 * @param {string} cipherOrPlain
 * @returns {string} decrypted string
 */
function decryptSecret(cipherOrPlain) {
  if (!cipherOrPlain || typeof cipherOrPlain !== 'string') return cipherOrPlain;
  const str = cipherOrPlain.trim();
  if (!str.startsWith('enc:v1:')) return str; // plaintext

  try {
    const parts = str.split(':');
    if (parts.length !== 5) return str;
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const ciphertext = parts[4];

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[SecretVault] Error decrypting secret:', e.message);
    return str;
  }
}

/**
 * Mask a secret string for safe display in logs, UI and API responses
 * Example: vk1.a.1NRncMm... -> vk1.a.••••••••••••••••6LYg
 */
function maskSecret(str, keepStart = 6, keepEnd = 4) {
  if (!str || typeof str !== 'string') return '';
  const decrypted = decryptSecret(str);
  if (decrypted.length <= keepStart + keepEnd) {
    return '••••••••••••';
  }
  return decrypted.slice(0, keepStart) + '••••••••••••••••' + decrypted.slice(-keepEnd);
}

/**
 * Check if a string is a masked token (contains bullet points or asterisks)
 */
function isMasked(str) {
  if (!str || typeof str !== 'string') return false;
  return str.includes('••••') || str.includes('****');
}

module.exports = {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMasked
};
