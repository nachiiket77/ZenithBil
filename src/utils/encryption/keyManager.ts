import { CryptoEngine, KeyPair } from './cryptoEngine';
import { SecurityLogger } from './cryptoEngine';

export interface StoredKey {
  id: string;
  name: string;
  type: 'symmetric' | 'asymmetric';
  algorithm: string;
  keyData: string;
  publicKey?: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata: {
    purpose: string;
    owner: string;
    permissions: string[];
  };
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
  notifyBeforeExpiry: number; // days
}

export class KeyManager {
  private cryptoEngine: CryptoEngine;
  private securityLogger: SecurityLogger;
  private keys: Map<string, StoredKey> = new Map();
  private masterPassword: string | null = null;

  constructor() {
    this.cryptoEngine = new CryptoEngine();
    this.securityLogger = new SecurityLogger();
    this.loadKeysFromStorage();
  }

  /**
   * Initialize key manager with master password
   */
  async initialize(masterPassword: string): Promise<void> {
    try {
      this.validateMasterPassword(masterPassword);
      this.masterPassword = masterPassword;
      
      // Verify master password by attempting to decrypt existing keys
      await this.verifyMasterPassword();
      
      this.securityLogger.logEvent('KEY_MANAGER_INIT', 'success', {
        keyCount: this.keys.size
      });
    } catch (error) {
      this.securityLogger.logEvent('KEY_MANAGER_INIT', 'error', {
        error: error.message
      });
      throw new Error(`Key manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate and store a new symmetric key
   */
  async generateSymmetricKey(
    name: string,
    purpose: string,
    owner: string,
    expirationDays?: number
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const keyId = this.generateKeyId();
      const keyData = this.cryptoEngine.generateSecureKey();
      
      // Encrypt the key with master password
      const encryptedKey = await this.cryptoEngine.encryptText(keyData, this.masterPassword!);
      
      const expiresAt = expirationDays 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      const storedKey: StoredKey = {
        id: keyId,
        name,
        type: 'symmetric',
        algorithm: 'AES-256',
        keyData: JSON.stringify(encryptedKey),
        createdAt: new Date(),
        expiresAt,
        metadata: {
          purpose,
          owner,
          permissions: ['encrypt', 'decrypt']
        }
      };

      this.keys.set(keyId, storedKey);
      await this.saveKeysToStorage();

      this.securityLogger.logEvent('SYMMETRIC_KEY_GENERATION', 'success', {
        keyId,
        name,
        purpose,
        owner,
        expiresAt
      });

      return keyId;
    } catch (error) {
      this.securityLogger.logEvent('SYMMETRIC_KEY_GENERATION', 'error', {
        name,
        error: error.message
      });
      throw new Error(`Failed to generate symmetric key: ${error.message}`);
    }
  }

  /**
   * Generate and store a new asymmetric key pair
   */
  async generateAsymmetricKeyPair(
    name: string,
    purpose: string,
    owner: string,
    keySize: number = 2048,
    expirationDays?: number
  ): Promise<string> {
    try {
      this.ensureInitialized();
      
      const keyId = this.generateKeyId();
      const keyPair = await this.cryptoEngine.generateKeyPair(keySize);
      
      // Encrypt the private key with master password
      const encryptedPrivateKey = await this.cryptoEngine.encryptText(
        keyPair.privateKey,
        this.masterPassword!
      );
      
      const expiresAt = expirationDays 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
        : undefined;

      const storedKey: StoredKey = {
        id: keyId,
        name,
        type: 'asymmetric',
        algorithm: `RSA-${keySize}`,
        keyData: JSON.stringify(encryptedPrivateKey),
        publicKey: keyPair.publicKey,
        createdAt: new Date(),
        expiresAt,
        metadata: {
          purpose,
          owner,
          permissions: ['sign', 'decrypt']
        }
      };

      this.keys.set(keyId, storedKey);
      await this.saveKeysToStorage();

      this.securityLogger.logEvent('ASYMMETRIC_KEY_GENERATION', 'success', {
        keyId,
        name,
        purpose,
        owner,
        keySize,
        expiresAt
      });

      return keyId;
    } catch (error) {
      this.securityLogger.logEvent('ASYMMETRIC_KEY_GENERATION', 'error', {
        name,
        error: error.message
      });
      throw new Error(`Failed to generate asymmetric key pair: ${error.message}`);
    }
  }

  /**
   * Retrieve a decrypted key
   */
  async getKey(keyId: string): Promise<string> {
    try {
      this.ensureInitialized();
      
      const storedKey = this.keys.get(keyId);
      if (!storedKey) {
        throw new Error('Key not found');
      }

      // Check if key is expired
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        throw new Error('Key has expired');
      }

      // Decrypt the key
      const encryptedKey = JSON.parse(storedKey.keyData);
      const decryptedKey = await this.cryptoEngine.decryptText(encryptedKey, this.masterPassword!);

      this.securityLogger.logEvent('KEY_RETRIEVAL', 'success', {
        keyId,
        keyType: storedKey.type,
        purpose: storedKey.metadata.purpose
      });

      return decryptedKey;
    } catch (error) {
      this.securityLogger.logEvent('KEY_RETRIEVAL', 'error', {
        keyId,
        error: error.message
      });
      throw new Error(`Failed to retrieve key: ${error.message}`);
    }
  }

  /**
   * Get public key for asymmetric key pair
   */
  getPublicKey(keyId: string): string {
    try {
      const storedKey = this.keys.get(keyId);
      if (!storedKey) {
        throw new Error('Key not found');
      }

      if (storedKey.type !== 'asymmetric' || !storedKey.publicKey) {
        throw new Error('Key is not an asymmetric key pair');
      }

      this.securityLogger.logEvent('PUBLIC_KEY_RETRIEVAL', 'success', {
        keyId,
        purpose: storedKey.metadata.purpose
      });

      return storedKey.publicKey;
    } catch (error) {
      this.securityLogger.logEvent('PUBLIC_KEY_RETRIEVAL', 'error', {
        keyId,
        error: error.message
      });
      throw new Error(`Failed to retrieve public key: ${error.message}`);
    }
  }

  /**
   * List all keys (without sensitive data)
   */
  listKeys(): Array<Omit<StoredKey, 'keyData'>> {
    return Array.from(this.keys.values()).map(key => ({
      id: key.id,
      name: key.name,
      type: key.type,
      algorithm: key.algorithm,
      publicKey: key.publicKey,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      metadata: key.metadata
    }));
  }

  /**
   * Delete a key
   */
  async deleteKey(keyId: string): Promise<void> {
    try {
      this.ensureInitialized();
      
      const storedKey = this.keys.get(keyId);
      if (!storedKey) {
        throw new Error('Key not found');
      }

      this.keys.delete(keyId);
      await this.saveKeysToStorage();

      this.securityLogger.logEvent('KEY_DELETION', 'success', {
        keyId,
        keyName: storedKey.name,
        keyType: storedKey.type
      });
    } catch (error) {
      this.securityLogger.logEvent('KEY_DELETION', 'error', {
        keyId,
        error: error.message
      });
      throw new Error(`Failed to delete key: ${error.message}`);
    }
  }

  /**
   * Rotate a key (generate new key with same metadata)
   */
  async rotateKey(keyId: string): Promise<string> {
    try {
      this.ensureInitialized();
      
      const oldKey = this.keys.get(keyId);
      if (!oldKey) {
        throw new Error('Key not found');
      }

      // Generate new key with same metadata
      let newKeyId: string;
      if (oldKey.type === 'symmetric') {
        newKeyId = await this.generateSymmetricKey(
          oldKey.name,
          oldKey.metadata.purpose,
          oldKey.metadata.owner,
          oldKey.expiresAt ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined
        );
      } else {
        const keySize = parseInt(oldKey.algorithm.split('-')[1]);
        newKeyId = await this.generateAsymmetricKeyPair(
          oldKey.name,
          oldKey.metadata.purpose,
          oldKey.metadata.owner,
          keySize,
          oldKey.expiresAt ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : undefined
        );
      }

      // Delete old key
      await this.deleteKey(keyId);

      this.securityLogger.logEvent('KEY_ROTATION', 'success', {
        oldKeyId: keyId,
        newKeyId,
        keyType: oldKey.type
      });

      return newKeyId;
    } catch (error) {
      this.securityLogger.logEvent('KEY_ROTATION', 'error', {
        keyId,
        error: error.message
      });
      throw new Error(`Failed to rotate key: ${error.message}`);
    }
  }

  /**
   * Check for expiring keys
   */
  getExpiringKeys(daysAhead: number = 30): StoredKey[] {
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    
    return Array.from(this.keys.values()).filter(key => 
      key.expiresAt && key.expiresAt <= cutoffDate && key.expiresAt > new Date()
    );
  }

  /**
   * Export keys (encrypted)
   */
  async exportKeys(): Promise<string> {
    try {
      this.ensureInitialized();
      
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        keys: Array.from(this.keys.values())
      };

      const exportJson = JSON.stringify(exportData, null, 2);
      
      this.securityLogger.logEvent('KEY_EXPORT', 'success', {
        keyCount: this.keys.size
      });

      return exportJson;
    } catch (error) {
      this.securityLogger.logEvent('KEY_EXPORT', 'error', {
        error: error.message
      });
      throw new Error(`Failed to export keys: ${error.message}`);
    }
  }

  /**
   * Import keys
   */
  async importKeys(exportData: string): Promise<void> {
    try {
      this.ensureInitialized();
      
      const data = JSON.parse(exportData);
      
      if (!data.version || !data.keys) {
        throw new Error('Invalid export format');
      }

      let importedCount = 0;
      for (const keyData of data.keys) {
        if (!this.keys.has(keyData.id)) {
          this.keys.set(keyData.id, keyData);
          importedCount++;
        }
      }

      await this.saveKeysToStorage();

      this.securityLogger.logEvent('KEY_IMPORT', 'success', {
        totalKeys: data.keys.length,
        importedCount
      });
    } catch (error) {
      this.securityLogger.logEvent('KEY_IMPORT', 'error', {
        error: error.message
      });
      throw new Error(`Failed to import keys: ${error.message}`);
    }
  }

  /**
   * Change master password
   */
  async changeMasterPassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      if (this.masterPassword !== oldPassword) {
        throw new Error('Invalid current master password');
      }

      this.validateMasterPassword(newPassword);

      // Re-encrypt all keys with new master password
      for (const [keyId, storedKey] of this.keys.entries()) {
        const encryptedKey = JSON.parse(storedKey.keyData);
        const decryptedKey = await this.cryptoEngine.decryptText(encryptedKey, oldPassword);
        const reEncryptedKey = await this.cryptoEngine.encryptText(decryptedKey, newPassword);
        
        storedKey.keyData = JSON.stringify(reEncryptedKey);
        this.keys.set(keyId, storedKey);
      }

      this.masterPassword = newPassword;
      await this.saveKeysToStorage();

      this.securityLogger.logEvent('MASTER_PASSWORD_CHANGE', 'success', {
        keyCount: this.keys.size
      });
    } catch (error) {
      this.securityLogger.logEvent('MASTER_PASSWORD_CHANGE', 'error', {
        error: error.message
      });
      throw new Error(`Failed to change master password: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.masterPassword) {
      throw new Error('Key manager not initialized. Call initialize() first.');
    }
  }

  private validateMasterPassword(password: string): void {
    if (!password || password.length < 12) {
      throw new Error('Master password must be at least 12 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      throw new Error('Master password must contain uppercase, lowercase, numbers, and special characters');
    }
  }

  private async verifyMasterPassword(): Promise<void> {
    if (this.keys.size === 0) {
      return; // No keys to verify against
    }

    // Try to decrypt the first key to verify master password
    const firstKey = this.keys.values().next().value;
    if (firstKey) {
      try {
        const encryptedKey = JSON.parse(firstKey.keyData);
        await this.cryptoEngine.decryptText(encryptedKey, this.masterPassword!);
      } catch (error) {
        throw new Error('Invalid master password');
      }
    }
  }

  private async saveKeysToStorage(): Promise<void> {
    try {
      const keysArray = Array.from(this.keys.entries());
      localStorage.setItem('zenithbill_encrypted_keys', JSON.stringify(keysArray));
    } catch (error) {
      this.securityLogger.logEvent('KEY_STORAGE_SAVE', 'error', {
        error: error.message
      });
      throw new Error('Failed to save keys to storage');
    }
  }

  private loadKeysFromStorage(): void {
    try {
      const stored = localStorage.getItem('zenithbill_encrypted_keys');
      if (stored) {
        const keysArray = JSON.parse(stored);
        this.keys = new Map(keysArray);
      }
    } catch (error) {
      this.securityLogger.logEvent('KEY_STORAGE_LOAD', 'error', {
        error: error.message
      });
      // Don't throw here, just log the error
    }
  }
}