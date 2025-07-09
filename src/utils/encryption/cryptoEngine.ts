declare global {
  interface Window {
    electronAPI?: {
      crypto: {
        generateKeyPair: (keySize: number) => Promise<{ publicKey: string; privateKey: string }>;
        deriveKey: (password: string, salt: string, keyLength: number) => Promise<string>;
        encryptText: (plaintext: string, password: string, config: any) => Promise<EncryptionResult>;
        decryptText: (encryptionResult: EncryptionResult, password: string, config: any) => Promise<string>;
        createDigitalSignature: (data: string, privateKey: string) => Promise<string>;
        verifyDigitalSignature: (data: string, signature: string, publicKey: string) => Promise<boolean>;
        generateSecureHash: (data: string, algorithm?: string) => Promise<string>;
        randomBytes: (length: number) => Promise<string>;
      };
    };
  }
}

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  tag?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
}

export class CryptoEngine {
  private static readonly DEFAULT_CONFIG: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 32,
    tagLength: 16
  };

  private config: EncryptionConfig;
  private securityLogger: SecurityLogger;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = { ...CryptoEngine.DEFAULT_CONFIG, ...config };
    this.securityLogger = new SecurityLogger();
  }

  /**
   * Generate a cryptographically secure random key
   */
  async generateSecureKey(length: number = this.config.keyLength): Promise<string> {
    try {
      let key: string;
      
      if (window.electronAPI) {
        key = await window.electronAPI.crypto.randomBytes(length);
      } else if (window.crypto && window.crypto.getRandomValues) {
        // Browser fallback using Web Crypto API
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      } else {
        throw new Error('No secure random number generator available');
      }
      
      this.securityLogger.logEvent('KEY_GENERATION', 'success', { keyLength: length });
      return key;
    } catch (error) {
      this.securityLogger.logEvent('KEY_GENERATION', 'error', { error: error.message });
      throw new Error('Failed to generate secure key');
    }
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  async generateKeyPair(keySize: number = 2048): Promise<KeyPair> {
    try {
      let keyPair: KeyPair;
      
      if (window.electronAPI) {
        keyPair = await window.electronAPI.crypto.generateKeyPair(keySize);
      } else {
        throw new Error('Key pair generation not supported in browser environment');
      }

      this.securityLogger.logEvent('KEYPAIR_GENERATION', 'success', { keySize });
      return keyPair;
    } catch (error) {
      this.securityLogger.logEvent('KEYPAIR_GENERATION', 'error', { error: error.message });
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Derive key from password using PBKDF2 (scrypt)
   */
  async deriveKey(password: string, salt: string): Promise<string> {
    try {
      let derivedKey: string;
      
      if (window.electronAPI) {
        derivedKey = await window.electronAPI.crypto.deriveKey(password, salt, this.config.keyLength);
      } else {
        throw new Error('Key derivation not supported in browser environment');
      }

      this.securityLogger.logEvent('KEY_DERIVATION', 'success', { saltLength: salt.length });
      return derivedKey;
    } catch (error) {
      this.securityLogger.logEvent('KEY_DERIVATION', 'error', { error: error.message });
      throw new Error('Failed to derive key from password');
    }
  }

  /**
   * Encrypt text using AES-256-GCM
   */
  async encryptText(plaintext: string, password: string): Promise<EncryptionResult> {
    try {
      if (!plaintext || !password) {
        throw new Error('Plaintext and password are required');
      }

      let result: EncryptionResult;
      
      if (window.electronAPI) {
        result = await window.electronAPI.crypto.encryptText(plaintext, password, this.config);
      } else {
        throw new Error('Text encryption not supported in browser environment');
      }

      this.securityLogger.logEvent('TEXT_ENCRYPTION', 'success', { 
        algorithm: this.config.algorithm,
        dataLength: plaintext.length 
      });

      return result;
    } catch (error) {
      this.securityLogger.logEvent('TEXT_ENCRYPTION', 'error', { error: error.message });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   */
  async decryptText(encryptionResult: EncryptionResult, password: string): Promise<string> {
    try {
      if (!encryptionResult.encryptedData || !password) {
        throw new Error('Encrypted data and password are required');
      }

      let decrypted: string;
      
      if (window.electronAPI) {
        decrypted = await window.electronAPI.crypto.decryptText(encryptionResult, password, this.config);
      } else {
        throw new Error('Text decryption not supported in browser environment');
      }

      this.securityLogger.logEvent('TEXT_DECRYPTION', 'success', { 
        algorithm: this.config.algorithm 
      });

      return decrypted;
    } catch (error) {
      this.securityLogger.logEvent('TEXT_DECRYPTION', 'error', { error: error.message });
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Create digital signature
   */
  async createDigitalSignature(data: string, privateKey: string): Promise<string> {
    try {
      let signature: string;
      
      if (window.electronAPI) {
        signature = await window.electronAPI.crypto.createDigitalSignature(data, privateKey);
      } else {
        throw new Error('Digital signature creation not supported in browser environment');
      }
      
      this.securityLogger.logEvent('SIGNATURE_CREATION', 'success', { 
        dataLength: data.length 
      });
      
      return signature;
    } catch (error) {
      this.securityLogger.logEvent('SIGNATURE_CREATION', 'error', { error: error.message });
      throw new Error(`Failed to create digital signature: ${error.message}`);
    }
  }

  /**
   * Verify digital signature
   */
  async verifyDigitalSignature(data: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      let isValid: boolean;
      
      if (window.electronAPI) {
        isValid = await window.electronAPI.crypto.verifyDigitalSignature(data, signature, publicKey);
      } else {
        throw new Error('Digital signature verification not supported in browser environment');
      }
      
      this.securityLogger.logEvent('SIGNATURE_VERIFICATION', isValid ? 'success' : 'failure', { 
        dataLength: data.length,
        signatureValid: isValid 
      });
      
      return isValid;
    } catch (error) {
      this.securityLogger.logEvent('SIGNATURE_VERIFICATION', 'error', { error: error.message });
      throw new Error(`Failed to verify digital signature: ${error.message}`);
    }
  }

  /**
   * Generate secure hash
   */
  async generateSecureHash(data: string, algorithm: string = 'sha256'): Promise<string> {
    try {
      let result: string;
      
      if (window.electronAPI) {
        result = await window.electronAPI.crypto.generateSecureHash(data, algorithm);
      } else if (window.crypto && window.crypto.subtle) {
        // Browser fallback using Web Crypto API
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        throw new Error('Hash generation not supported in this environment');
      }
      
      this.securityLogger.logEvent('HASH_GENERATION', 'success', { 
        algorithm,
        dataLength: data.length 
      });
      
      return result;
    } catch (error) {
      this.securityLogger.logEvent('HASH_GENERATION', 'error', { error: error.message });
      throw new Error(`Failed to generate hash: ${error.message}`);
    }
  }

  /**
   * Validate encryption parameters
   */
  private validateEncryptionParams(data: any, password: string): void {
    if (!data) {
      throw new Error('Data is required for encryption');
    }
    
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
      this.securityLogger.logEvent('WEAK_PASSWORD', 'warning', { 
        hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar 
      });
    }
  }
}

class SecurityLogger {
  private logs: Array<{
    timestamp: Date;
    event: string;
    status: 'success' | 'error' | 'warning' | 'failure';
    details: any;
    sessionId: string;
  }> = [];

  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  logEvent(event: string, status: 'success' | 'error' | 'warning' | 'failure', details: any = {}): void {
    const logEntry = {
      timestamp: new Date(),
      event,
      status,
      details,
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);
    
    // In production, you would send this to a secure logging service
    if (status === 'error' || status === 'failure') {
      console.error(`[SECURITY] ${event}:`, logEntry);
    } else {
      console.log(`[SECURITY] ${event}:`, logEntry);
    }

    // Keep only last 1000 logs in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  getLogs(filter?: { event?: string; status?: string; since?: Date }): typeof this.logs {
    let filteredLogs = this.logs;

    if (filter) {
      if (filter.event) {
        filteredLogs = filteredLogs.filter(log => log.event === filter.event);
      }
      if (filter.status) {
        filteredLogs = filteredLogs.filter(log => log.status === filter.status);
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }
    }

    return filteredLogs;
  }

  private generateSessionId(): string {
    if (window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for environments without crypto.getRandomValues
      return Math.random().toString(36).substr(2, 16);
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.logEvent('LOGS_CLEARED', 'success');
  }
}

export { SecurityLogger };