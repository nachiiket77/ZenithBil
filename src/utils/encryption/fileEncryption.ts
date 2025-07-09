import { CryptoEngine, EncryptionResult } from './cryptoEngine';
import { SecurityLogger } from './cryptoEngine';

export interface FileEncryptionResult {
  encryptedContent: string;
  metadata: {
    originalName: string;
    originalSize: number;
    encryptedSize: number;
    mimeType: string;
    checksum: string;
  };
  encryption: EncryptionResult;
}

export class FileEncryption {
  private cryptoEngine: CryptoEngine;
  private securityLogger: SecurityLogger;

  constructor() {
    this.cryptoEngine = new CryptoEngine();
    this.securityLogger = new SecurityLogger();
  }

  /**
   * Encrypt a file
   */
  async encryptFile(file: File, password: string): Promise<FileEncryptionResult> {
    try {
      this.validateFile(file);
      this.validatePassword(password);

      // Read file content
      const fileContent = await this.readFileAsText(file);
      
      // Generate checksum for integrity verification
      const checksum = await this.cryptoEngine.generateSecureHash(fileContent);
      
      // Encrypt the file content
      const encryptionResult = await this.cryptoEngine.encryptText(fileContent, password);
      
      const result: FileEncryptionResult = {
        encryptedContent: encryptionResult.encryptedData,
        metadata: {
          originalName: file.name,
          originalSize: file.size,
          encryptedSize: encryptionResult.encryptedData.length,
          mimeType: file.type,
          checksum
        },
        encryption: encryptionResult
      };

      this.securityLogger.logEvent('FILE_ENCRYPTION', 'success', {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });

      return result;
    } catch (error) {
      this.securityLogger.logEvent('FILE_ENCRYPTION', 'error', {
        fileName: file.name,
        error: error.message
      });
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a file
   */
  async decryptFile(fileEncryptionResult: FileEncryptionResult, password: string): Promise<Blob> {
    try {
      this.validatePassword(password);

      // Decrypt the file content
      const decryptedContent = await this.cryptoEngine.decryptText(
        fileEncryptionResult.encryption,
        password
      );

      // Verify integrity using checksum
      const calculatedChecksum = await this.cryptoEngine.generateSecureHash(decryptedContent);
      if (calculatedChecksum !== fileEncryptionResult.metadata.checksum) {
        throw new Error('File integrity check failed - file may be corrupted');
      }

      // Create blob with original mime type
      const blob = new Blob([decryptedContent], {
        type: fileEncryptionResult.metadata.mimeType
      });

      this.securityLogger.logEvent('FILE_DECRYPTION', 'success', {
        fileName: fileEncryptionResult.metadata.originalName,
        originalSize: fileEncryptionResult.metadata.originalSize
      });

      return blob;
    } catch (error) {
      this.securityLogger.logEvent('FILE_DECRYPTION', 'error', {
        fileName: fileEncryptionResult.metadata.originalName,
        error: error.message
      });
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt multiple files
   */
  async encryptMultipleFiles(files: FileList, password: string): Promise<FileEncryptionResult[]> {
    const results: FileEncryptionResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.encryptFile(files[i], password);
        results.push(result);
      } catch (error) {
        errors.push(`${files[i].name}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      this.securityLogger.logEvent('BATCH_FILE_ENCRYPTION', 'warning', {
        totalFiles: files.length,
        successCount: results.length,
        errorCount: errors.length,
        errors
      });
    } else {
      this.securityLogger.logEvent('BATCH_FILE_ENCRYPTION', 'success', {
        totalFiles: files.length,
        successCount: results.length
      });
    }

    return results;
  }

  /**
   * Create encrypted backup of data
   */
  async createEncryptedBackup(data: any, password: string, filename: string = 'backup.json'): Promise<FileEncryptionResult> {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const file = new File([blob], filename, { type: 'application/json' });

      return await this.encryptFile(file, password);
    } catch (error) {
      this.securityLogger.logEvent('BACKUP_CREATION', 'error', {
        filename,
        error: error.message
      });
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Restore data from encrypted backup
   */
  async restoreFromEncryptedBackup(fileEncryptionResult: FileEncryptionResult, password: string): Promise<any> {
    try {
      const blob = await this.decryptFile(fileEncryptionResult, password);
      const text = await blob.text();
      const data = JSON.parse(text);

      this.securityLogger.logEvent('BACKUP_RESTORATION', 'success', {
        filename: fileEncryptionResult.metadata.originalName
      });

      return data;
    } catch (error) {
      this.securityLogger.logEvent('BACKUP_RESTORATION', 'error', {
        filename: fileEncryptionResult.metadata.originalName,
        error: error.message
      });
      throw new Error(`Backup restoration failed: ${error.message}`);
    }
  }

  /**
   * Read file as text
   */
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Validate file
   */
  private validateFile(file: File): void {
    if (!file) {
      throw new Error('File is required');
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds maximum limit of 50MB');
    }

    // Check for potentially dangerous file types
    const dangerousTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program'
    ];

    if (dangerousTypes.includes(file.type)) {
      throw new Error('File type not allowed for security reasons');
    }
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
  }

  /**
   * Get encryption statistics
   */
  getEncryptionStats(): any {
    return this.securityLogger.getLogs({ event: 'FILE_ENCRYPTION' });
  }

  /**
   * Get decryption statistics
   */
  getDecryptionStats(): any {
    return this.securityLogger.getLogs({ event: 'FILE_DECRYPTION' });
  }
}