# ZenithBill - Professional Restaurant Management System

A comprehensive restaurant billing and management system with enterprise-grade security features.

## 🔐 Security Features

### Encryption System
- **AES-256-GCM** encryption for symmetric operations
- **RSA-2048/4096** key pairs for asymmetric encryption
- **PBKDF2 (scrypt)** for secure key derivation
- **Digital signatures** with SHA-256 hashing
- **Secure random number generation** using crypto.randomBytes

### Key Management
- **Master password protection** for key storage
- **Automatic key rotation** with configurable intervals
- **Key expiration** and lifecycle management
- **Secure key export/import** functionality
- **Multiple key types**: symmetric and asymmetric

### Data Protection
- **File encryption/decryption** with integrity verification
- **Text encryption** with salt and IV
- **Secure storage** with compression and expiration
- **Encrypted backups** with password protection
- **Data integrity checks** using checksums

### Security Monitoring
- **Comprehensive logging** of all security events
- **Security audit** functionality
- **Failed attempt tracking**
- **Session management** with timeouts
- **Real-time security status** monitoring

## 🚀 Features

### Core Functionality
- **Customer Management**: Add, edit, and manage customer information
- **Billing System**: Create professional bills with automatic calculations
- **CSV Data Integration**: Import/export data from CSV files
- **Reports & Analytics**: Generate detailed reports and statistics
- **WhatsApp Integration**: Share bills directly via WhatsApp

### Security & Encryption
- **Enterprise-grade encryption** for all sensitive data
- **Secure key management** with master password protection
- **Digital signatures** for document authenticity
- **Encrypted file storage** with integrity verification
- **Secure backup and recovery** systems

### User Interface
- **Glassmorphism design** with modern aesthetics
- **Responsive layout** for all device sizes
- **Real-time calculations** and updates
- **Intuitive navigation** with tabbed interface
- **Professional styling** with hover animations

## 🛡️ Security Standards Compliance

### Encryption Standards
- **FIPS 140-2** compatible algorithms
- **NIST SP 800-38D** (GCM mode) implementation
- **RFC 3447** (RSA PKCS#1) compliance
- **RFC 2898** (PBKDF2) key derivation

### Security Best Practices
- **Zero-knowledge architecture** for password storage
- **Salt and IV** for all encryption operations
- **Secure key generation** using cryptographically secure PRNGs
- **Memory-safe operations** with automatic cleanup
- **Input validation** and sanitization

## 📋 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Modern web browser with crypto API support
- HTTPS connection (required for crypto operations)

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Security Configuration
1. **Initialize Key Manager**: Set up master password for key encryption
2. **Enable Data Encryption**: Protect customer and billing data
3. **Configure Backups**: Set up encrypted backup schedules
4. **Security Audit**: Run regular security checks

## 🔧 Usage

### Basic Operations
1. **Login**: Use admin@zenithbill.com with any password for demo
2. **Customer Management**: Add customers via CSV import or manual entry
3. **Billing**: Create bills with automatic calculations
4. **Security**: Access encryption tools via Settings > Encryption

### Encryption Features
1. **Text Encryption**: Encrypt/decrypt sensitive text data
2. **File Encryption**: Secure file storage with integrity checks
3. **Key Management**: Generate and manage encryption keys
4. **Digital Signatures**: Create and verify document signatures

### Data Import
1. **CSV Import**: Upload Book1.csv or custom formatted files
2. **Data Validation**: Automatic validation and error reporting
3. **Backup/Restore**: Encrypted backup and recovery options

## 🔐 Security Architecture

### Encryption Flow
```
User Data → Salt + IV → PBKDF2 → AES-256-GCM → Encrypted Storage
```

### Key Management Flow
```
Master Password → Key Derivation → Encrypted Key Storage → Secure Retrieval
```

### Authentication Flow
```
Login → Session Token → Timeout Management → Secure Logout
```

## 📊 Security Monitoring

### Event Logging
- All encryption/decryption operations
- Key generation and management events
- Authentication attempts and failures
- Data access and modification logs

### Audit Features
- Security configuration validation
- Key expiration monitoring
- Password strength assessment
- System vulnerability checks

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── security/          # Encryption UI components
│   ├── settings/          # Security settings
│   └── ...
├── utils/
│   ├── encryption/        # Core encryption utilities
│   │   ├── cryptoEngine.ts
│   │   ├── fileEncryption.ts
│   │   ├── keyManager.ts
│   │   └── secureStorage.ts
│   └── ...
```

### Security Testing
```bash
# Run security audit
npm run security-audit

# Test encryption functions
npm run test:encryption

# Validate key management
npm run test:keys
```

## 📝 API Reference

### CryptoEngine
```typescript
// Text encryption
const result = await cryptoEngine.encryptText(plaintext, password);
const decrypted = await cryptoEngine.decryptText(result, password);

// Key generation
const keyPair = await cryptoEngine.generateKeyPair();
const signature = cryptoEngine.createDigitalSignature(data, privateKey);
```

### KeyManager
```typescript
// Initialize with master password
await keyManager.initialize(masterPassword);

// Generate keys
const keyId = await keyManager.generateSymmetricKey(name, purpose, owner);
const keyPairId = await keyManager.generateAsymmetricKeyPair(name, purpose, owner);
```

### SecureStorage
```typescript
// Store encrypted data
await secureStorage.store(key, data, password, options);

// Retrieve decrypted data
const data = await secureStorage.retrieve(key, password);
```

## 🔒 Security Considerations

### Production Deployment
- Use HTTPS for all communications
- Implement proper session management
- Regular security audits and updates
- Secure key backup procedures
- Monitor for security events

### Password Requirements
- **Master Password**: Minimum 12 characters with complexity requirements
- **Encryption Password**: Minimum 8 characters with strength validation
- **Regular rotation** of passwords and keys

## 📞 Support

For security-related issues or questions:
- Review security documentation
- Check audit logs for issues
- Verify encryption configuration
- Contact security team for critical issues

## 📄 License

This project includes enterprise-grade security features and should be used in compliance with applicable security regulations and standards.

---

**⚠️ Security Notice**: This system handles sensitive financial and customer data. Ensure proper security measures are in place before production deployment.