import { safeStorage } from "electron"

/**
 * Encrypt string using Electron's safeStorage
 * Follows same pattern as anthropic-accounts router
 */
export function encryptString(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[Encryption] Encryption not available, storing as base64")
    return Buffer.from(plaintext).toString("base64")
  }
  return safeStorage.encryptString(plaintext).toString("base64")
}

/**
 * Decrypt string using Electron's safeStorage
 */
export function decryptString(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encrypted, "base64").toString("utf-8")
  }
  const buffer = Buffer.from(encrypted, "base64")
  return safeStorage.decryptString(buffer)
}
