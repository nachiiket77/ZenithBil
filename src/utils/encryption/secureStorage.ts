import { CryptoEngine, EncryptionResult } from './cryptoEngine';
import { SecurityLogger } from './cryptoEngine';

export interface SecureStorageOptions {
  keyId?: string;
  expirationTime?: number; // milliseconds
  compressionEnabled?: boolean;
  integrityCheck?: boolean;
}

export interface SecureStorageItem {
  id: string;
  encryptedData: EncryptionResult;
  metadata: {
    originalSize: number;
    encryptedSize: number;
    checksum: string;
    createdAt: Date;
    expiresAt?: Date;
    compressed: boolean;
    keyId?: string;
  };
}

export class SecureStorage {
  private cryptoEngine: CryptoEngine;
  private securityLogger: SecurityLogger;
  private storageKey: string = 'zenithbill_secure_storage';

  constructor() {
    this.cryptoEngine = new CryptoEngine();
    this.securityLogger = new SecurityLogger();
  }

  /**
   * Store data securely
   */
  async store(
    key: string,
    data: any,
    password: string,
    options: SecureStorageOptions = {}
  ): Promise<void> {
    try {
      this.validateKey(key);
      this.validatePassword(password);

      // Serialize data
      const serializedData = JSON.stringify(data);
      
      // Compress if enabled
      const processedData = options.compressionEnabled 
        ? await this.compressData(serializedData)
        : serializedData;

      // Generate checksum for integrity
      const checksum = this.cryptoEngine.generateSecureHash(serializedData);

      // Encrypt data
      const encryptionResult = await this.cryptoEngine.encryptText(processedData, password);

      // Create storage item
      const storageItem: SecureStorageItem = {
        id: key,
        encryptedData: encryptionResult,
        metadata: {
          originalSize: serializedData.length,
          encryptedSize: encryptionResult.encryptedData.length,
          checksum,
          createdAt: new Date(),
          expiresAt: options.expirationTime 
            ? new Date(Date.now() + options.expirationTime)
            : undefined,
          compressed: options.compressionEnabled || false,
          keyId: options.keyId
        }
      };

      // Store in localStorage
      await this.saveToStorage(key, storageItem);

      this.securityLogger.logEvent('SECURE_STORAGE_STORE', 'success', {
        key,
        originalSize: serializedData.length,
        encryptedSize: encryptionResult.encryptedData.length,
        compressed: options.compressionEnabled,
        hasExpiration: !!options.expirationTime
      });

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_STORE', 'error', {
        key,
        error: error.message
      });
      throw new Error(`Failed to store data securely: ${error.message}`);
    }
  }

  /**
   * Retrieve data securely
   */
  async retrieve(key: string, password: string): Promise<any> {
    try {
      this.validateKey(key);
      this.validatePassword(password);

      // Load from storage
      const storageItem = await this.loadFromStorage(key);
      if (!storageItem) {
        throw new Error('Data not found');
      }

      // Check expiration
      if (storageItem.metadata.expiresAt && storageItem.metadata.expiresAt < new Date()) {
        await this.remove(key);
        throw new Error('Data has expired');
      }

      // Decrypt data
      const decryptedData = await this.cryptoEngine.decryptText(
        storageItem.encryptedData,
        password
      );

      // Decompress if needed
      const processedData = storageItem.metadata.compressed
        ? await this.decompressData(decryptedData)
        : decryptedData;

      // Verify integrity
      const calculatedChecksum = this.cryptoEngine.generateSecureHash(processedData);
      if (calculatedChecksum !== storageItem.metadata.checksum) {
        throw new Error('Data integrity check failed');
      }

      // Parse data
      const data = JSON.parse(processedData);

      this.securityLogger.logEvent('SECURE_STORAGE_RETRIEVE', 'success', {
        key,
        originalSize: storageItem.metadata.originalSize,
        compressed: storageItem.metadata.compressed
      });

      return data;

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_RETRIEVE', 'error', {
        key,
        error: error.message
      });
      throw new Error(`Failed to retrieve data securely: ${error.message}`);
    }
  }

  /**
   * Remove data
   */
  async remove(key: string): Promise<void> {
    try {
      this.validateKey(key);

      const fullKey = `${this.storageKey}_${key}`;
      localStorage.removeItem(fullKey);

      this.securityLogger.logEvent('SECURE_STORAGE_REMOVE', 'success', { key });

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_REMOVE', 'error', {
        key,
        error: error.message
      });
      throw new Error(`Failed to remove data: ${error.message}`);
    }
  }

  /**
   * Check if data exists
   */
  exists(key: string): boolean {
    try {
      this.validateKey(key);
      const fullKey = `${this.storageKey}_${key}`;
      return localStorage.getItem(fullKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all stored keys
   */
  listKeys(): string[] {
    const keys: string[] = [];
    const prefix = `${this.storageKey}_`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }

    return keys;
  }

  /**
   * Get metadata for stored item
   */
  async getMetadata(key: string): Promise<SecureStorageItem['metadata'] | null> {
    try {
      const storageItem = await this.loadFromStorage(key);
      return storageItem?.metadata || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up expired items
   */
  async cleanupExpired(): Promise<number> {
    const keys = this.listKeys();
    let cleanedCount = 0;

    for (const key of keys) {
      try {
        const metadata = await this.getMetadata(key);
        if (metadata?.expiresAt && metadata.expiresAt < new Date()) {
          await this.remove(key);
          cleanedCount++;
        }
      } catch (error) {
        // Continue with next key
      }
    }

    this.securityLogger.logEvent('SECURE_STORAGE_CLEANUP', 'success', {
      totalKeys: keys.length,
      cleanedCount
    });

    return cleanedCount;
  }

  /**
   * Update password for stored item
   */
  async updatePassword(key: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Retrieve data with old password
      const data = await this.retrieve(key, oldPassword);
      
      // Get current metadata
      const metadata = await this.getMetadata(key);
      
      // Store with new password
      await this.store(key, data, newPassword, {
        expirationTime: metadata?.expiresAt 
          ? metadata.expiresAt.getTime() - Date.now()
          : undefined,
        compressionEnabled: metadata?.compressed,
        keyId: metadata?.keyId
      });

      this.securityLogger.logEvent('SECURE_STORAGE_PASSWORD_UPDATE', 'success', { key });

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_PASSWORD_UPDATE', 'error', {
        key,
        error: error.message
      });
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Export all data (encrypted)
   */
  async exportData(): Promise<string> {
    try {
      const keys = this.listKeys();
      const exportData: any = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        items: {}
      };

      for (const key of keys) {
        const storageItem = await this.loadFromStorage(key);
        if (storageItem) {
          exportData.items[key] = storageItem;
        }
      }

      this.securityLogger.logEvent('SECURE_STORAGE_EXPORT', 'success', {
        keyCount: keys.length
      });

      return JSON.stringify(exportData, null, 2);

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_EXPORT', 'error', {
        error: error.message
      });
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Import data
   */
  async importData(exportData: string): Promise<void> {
    try {
      const data = JSON.parse(exportData);
      
      if (!data.version || !data.items) {
        throw new Error('Invalid export format');
      }

      let importedCount = 0;
      for (const [key, storageItem] of Object.entries(data.items)) {
        if (!this.exists(key)) {
          await this.saveToStorage(key, storageItem as SecureStorageItem);
          importedCount++;
        }
      }

      this.securityLogger.logEvent('SECURE_STORAGE_IMPORT', 'success', {
        totalItems: Object.keys(data.items).length,
        importedCount
      });

    } catch (error) {
      this.securityLogger.logEvent('SECURE_STORAGE_IMPORT', 'error', {
        error: error.message
      });
      throw new Error(`Failed to import data: ${error.message}`);
    }
  }

  /**
   * Private helper methods
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new Error('Invalid key: must be a non-empty string');
    }

    if (key.length > 100) {
      throw new Error('Key too long: maximum 100 characters');
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new Error('Key contains invalid characters: only alphanumeric, underscore, and dash allowed');
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
  }

  private async saveToStorage(key: string, storageItem: SecureStorageItem): Promise<void> {
    const fullKey = `${this.storageKey}_${key}`;
    const serialized = JSON.stringify(storageItem);
    
    try {
      localStorage.setItem(fullKey, serialized);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  private async loadFromStorage(key: string): Promise<SecureStorageItem | null> {
    const fullKey = `${this.storageKey}_${key}`;
    const stored = localStorage.getItem(fullKey);
    
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored);
    } catch (error) {
      throw new Error('Corrupted storage data');
    }
  }

  private async compressData(data: string): Promise<string> {
    // Simple compression using built-in compression
    // In production, you might want to use a more sophisticated compression library
    try {
      const compressed = btoa(data);
      return compressed;
    } catch (error) {
      throw new Error('Compression failed');
    }
  }

  private async decompressData(compressedData: string): Promise<string> {
    try {
      const decompressed = atob(compressedData);
      return decompressed;
    } catch (error) {
      throw new Error('Decompression failed');
    }
  }
}