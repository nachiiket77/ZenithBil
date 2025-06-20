import { generateKeyPair, createSign, createVerify, randomBytes, scrypt, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

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
  generateSecureKey(length: number = this.config.keyLength): string {
    try {
      const key = randomBytes(length);
      this.securityLogger.logEvent('KEY_GENERATION', 'success', { keyLength: length });
      return key.toString('hex');
    } catch (error) {
      this.securityLogger.logEvent('KEY_GENERATION', 'error', { error: error.message });
      throw new Error('Failed to generate secure key');
    }
  }

  /**
   * Generate RSA key pair for asymmetric encryption
   */
  async generateKeyPair(keySize: number = 2048): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      try {
        generateKeyPair('rsa', {
          modulusLength: keySize,
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        }, (err, publicKey, privateKey) => {
          if (err) {
            this.securityLogger.logEvent('KEYPAIR_GENERATION', 'error', { error: err.message });
            reject(new Error('Failed to generate key pair'));
            return;
          }

          this.securityLogger.logEvent('KEYPAIR_GENERATION', 'success', { keySize });
          resolve({ publicKey, privateKey });
        });
      } catch (error) {
        this.securityLogger.logEvent('KEYPAIR_GENERATION', 'error', { error: error.message });
        reject(new Error('Failed to generate key pair'));
      }
    });
  }

  /**
   * Derive key from password using PBKDF2 (scrypt)
   */
  async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    try {
      const derivedKey = await scryptAsync(password, salt, this.config.keyLength) as Buffer;
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

      const salt = randomBytes(this.config.saltLength);
      const iv = randomBytes(this.config.ivLength);
      const key = await this.deriveKey(password, salt);

      const cipher = createCipheriv(this.config.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = this.config.algorithm === 'aes-256-gcm' ? cipher.getAuthTag() : undefined;

      const result: EncryptionResult = {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag?.toString('hex')
      };

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

      const salt = Buffer.from(encryptionResult.salt, 'hex');
      const iv = Buffer.from(encryptionResult.iv, 'hex');
      const key = await this.deriveKey(password, salt);

      const decipher = createDecipheriv(this.config.algorithm, key, iv);
      
      if (this.config.algorithm === 'aes-256-gcm' && encryptionResult.tag) {
        const tag = Buffer.from(encryptionResult.tag, 'hex');
        decipher.setAuthTag(tag);
      }

      let decrypted = decipher.update(encryptionResult.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

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
  createDigitalSignature(data: string, privateKey: string): string {
    try {
      const sign = createSign('SHA256');
      sign.update(data);
      sign.end();
      
      const signature = sign.sign(privateKey, 'hex');
      
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
  verifyDigitalSignature(data: string, signature: string, publicKey: string): boolean {
    try {
      const verify = createVerify('SHA256');
      verify.update(data);
      verify.end();
      
      const isValid = verify.verify(publicKey, signature, 'hex');
      
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
  generateSecureHash(data: string, algorithm: string = 'sha256'): string {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      
      const result = hash.digest('hex');
      
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
    return randomBytes(16).toString('hex');
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