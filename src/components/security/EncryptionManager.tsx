import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, Unlock, Download, Upload, AlertTriangle, CheckCircle, FileText, Database } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CryptoEngine } from '../../utils/encryption/cryptoEngine';
import { FileEncryption } from '../../utils/encryption/fileEncryption';
import { KeyManager } from '../../utils/encryption/keyManager';
import { SecureStorage } from '../../utils/encryption/secureStorage';

export const EncryptionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('text');
  const [cryptoEngine] = useState(new CryptoEngine());
  const [fileEncryption] = useState(new FileEncryption());
  const [keyManager] = useState(new KeyManager());
  const [secureStorage] = useState(new SecureStorage());
  
  // Text encryption state
  const [textInput, setTextInput] = useState('');
  const [textPassword, setTextPassword] = useState('');
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  
  // File encryption state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePassword, setFilePassword] = useState('');
  const [encryptionResult, setEncryptionResult] = useState<any>(null);
  
  // Key management state
  const [masterPassword, setMasterPassword] = useState('');
  const [keyManagerInitialized, setKeyManagerInitialized] = useState(false);
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPurpose, setNewKeyPurpose] = useState('');
  const [newKeyOwner, setNewKeyOwner] = useState('');
  
  // Digital signature state
  const [signatureData, setSignatureData] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [signature, setSignature] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  
  // Status and error handling
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (keyManagerInitialized) {
      loadKeys();
    }
  }, [keyManagerInitialized]);

  const showStatus = (type: 'success' | 'error' | 'warning', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  const loadKeys = () => {
    try {
      const keyList = keyManager.listKeys();
      setKeys(keyList);
    } catch (error) {
      showStatus('error', `Failed to load keys: ${error.message}`);
    }
  };

  const initializeKeyManager = async () => {
    try {
      setLoading(true);
      await keyManager.initialize(masterPassword);
      setKeyManagerInitialized(true);
      showStatus('success', 'Key manager initialized successfully');
    } catch (error) {
      showStatus('error', `Failed to initialize key manager: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const encryptText = async () => {
    try {
      setLoading(true);
      const result = await cryptoEngine.encryptText(textInput, textPassword);
      setEncryptedText(JSON.stringify(result, null, 2));
      showStatus('success', 'Text encrypted successfully');
    } catch (error) {
      showStatus('error', `Encryption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const decryptText = async () => {
    try {
      setLoading(true);
      const encryptionData = JSON.parse(encryptedText);
      const result = await cryptoEngine.decryptText(encryptionData, textPassword);
      setDecryptedText(result);
      showStatus('success', 'Text decrypted successfully');
    } catch (error) {
      showStatus('error', `Decryption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const encryptFile = async () => {
    if (!selectedFile) {
      showStatus('error', 'Please select a file');
      return;
    }

    try {
      setLoading(true);
      const result = await fileEncryption.encryptFile(selectedFile, filePassword);
      setEncryptionResult(result);
      showStatus('success', 'File encrypted successfully');
    } catch (error) {
      showStatus('error', `File encryption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const decryptFile = async () => {
    if (!encryptionResult) {
      showStatus('error', 'No encrypted file available');
      return;
    }

    try {
      setLoading(true);
      const blob = await fileEncryption.decryptFile(encryptionResult, filePassword);
      
      // Download the decrypted file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = encryptionResult.metadata.originalName;
      a.click();
      URL.revokeObjectURL(url);
      
      showStatus('success', 'File decrypted and downloaded successfully');
    } catch (error) {
      showStatus('error', `File decryption failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSymmetricKey = async () => {
    try {
      setLoading(true);
      const keyId = await keyManager.generateSymmetricKey(
        newKeyName,
        newKeyPurpose,
        newKeyOwner
      );
      loadKeys();
      setNewKeyName('');
      setNewKeyPurpose('');
      setNewKeyOwner('');
      showStatus('success', `Symmetric key generated: ${keyId}`);
    } catch (error) {
      showStatus('error', `Key generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateAsymmetricKeyPair = async () => {
    try {
      setLoading(true);
      const keyId = await keyManager.generateAsymmetricKeyPair(
        newKeyName,
        newKeyPurpose,
        newKeyOwner
      );
      loadKeys();
      setNewKeyName('');
      setNewKeyPurpose('');
      setNewKeyOwner('');
      showStatus('success', `Asymmetric key pair generated: ${keyId}`);
    } catch (error) {
      showStatus('error', `Key pair generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateKeyPair = async () => {
    try {
      setLoading(true);
      const keyPair = await cryptoEngine.generateKeyPair();
      setPrivateKey(keyPair.privateKey);
      setPublicKey(keyPair.publicKey);
      showStatus('success', 'Key pair generated successfully');
    } catch (error) {
      showStatus('error', `Key pair generation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createSignature = () => {
    try {
      const sig = cryptoEngine.createDigitalSignature(signatureData, privateKey);
      setSignature(sig);
      showStatus('success', 'Digital signature created successfully');
    } catch (error) {
      showStatus('error', `Signature creation failed: ${error.message}`);
    }
  };

  const verifySignature = () => {
    try {
      const isValid = cryptoEngine.verifyDigitalSignature(signatureData, signature, publicKey);
      setVerificationResult(isValid);
      showStatus(isValid ? 'success' : 'error', 
        isValid ? 'Signature is valid' : 'Signature is invalid');
    } catch (error) {
      showStatus('error', `Signature verification failed: ${error.message}`);
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      await keyManager.deleteKey(keyId);
      loadKeys();
      showStatus('success', 'Key deleted successfully');
    } catch (error) {
      showStatus('error', `Key deletion failed: ${error.message}`);
    }
  };

  const tabs = [
    { id: 'text', label: 'Text Encryption', icon: FileText },
    { id: 'file', label: 'File Encryption', icon: Database },
    { id: 'keys', label: 'Key Management', icon: Key },
    { id: 'signature', label: 'Digital Signatures', icon: Shield }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Encryption Manager</h2>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="text-sm text-gray-600">Enterprise-Grade Security</span>
        </div>
      </div>

      {/* Status Messages */}
      {status && (
        <div className={`p-4 rounded-lg border ${
          status.type === 'success' ? 'bg-green-50/80 border-green-200 text-green-800' :
          status.type === 'error' ? 'bg-red-50/80 border-red-200 text-red-800' :
          'bg-yellow-50/80 border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
             status.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
             <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold">{status.message}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/60 p-1 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                transition-all duration-300
                ${activeTab === tab.id
                  ? 'bg-blue-500/80 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-white/80'
                }
              `}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Text Encryption Tab */}
      {activeTab === 'text' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="text-blue-600" />
              Encrypt Text
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Encrypt
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter text to encrypt..."
                />
              </div>
              
              <Input
                label="Password"
                type="password"
                value={textPassword}
                onChange={setTextPassword}
                placeholder="Enter encryption password"
                required
              />
              
              <Button
                variant="primary"
                onClick={encryptText}
                disabled={loading || !textInput || !textPassword}
                className="w-full"
              >
                {loading ? 'Encrypting...' : 'Encrypt Text'}
              </Button>
              
              {encryptedText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Encrypted Result
                  </label>
                  <textarea
                    value={encryptedText}
                    readOnly
                    className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-gray-50/80 text-sm font-mono"
                  />
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Unlock className="text-green-600" />
              Decrypt Text
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encrypted Data
                </label>
                <textarea
                  value={encryptedText}
                  onChange={(e) => setEncryptedText(e.target.value)}
                  className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-sm"
                  placeholder="Paste encrypted data here..."
                />
              </div>
              
              <Input
                label="Password"
                type="password"
                value={textPassword}
                onChange={setTextPassword}
                placeholder="Enter decryption password"
                required
              />
              
              <Button
                variant="success"
                onClick={decryptText}
                disabled={loading || !encryptedText || !textPassword}
                className="w-full"
              >
                {loading ? 'Decrypting...' : 'Decrypt Text'}
              </Button>
              
              {decryptedText && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Decrypted Result
                  </label>
                  <textarea
                    value={decryptedText}
                    readOnly
                    className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-green-50/80"
                  />
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* File Encryption Tab */}
      {activeTab === 'file' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Database className="text-blue-600" />
              File Encryption
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              
              <Input
                label="Password"
                type="password"
                value={filePassword}
                onChange={setFilePassword}
                placeholder="Enter encryption password"
                required
              />
              
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={encryptFile}
                  disabled={loading || !selectedFile || !filePassword}
                  className="flex-1"
                >
                  {loading ? 'Encrypting...' : 'Encrypt File'}
                </Button>
                
                <Button
                  variant="success"
                  onClick={decryptFile}
                  disabled={loading || !encryptionResult || !filePassword}
                  className="flex-1"
                >
                  {loading ? 'Decrypting...' : 'Decrypt File'}
                </Button>
              </div>
              
              {selectedFile && (
                <div className="p-3 bg-blue-50/80 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          {encryptionResult && (
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Encryption Result</h3>
              
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Original Name:</p>
                    <p className="font-semibold">{encryptionResult.metadata.originalName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Original Size:</p>
                    <p className="font-semibold">{(encryptionResult.metadata.originalSize / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Encrypted Size:</p>
                    <p className="font-semibold">{(encryptionResult.metadata.encryptedSize / 1024).toFixed(2)} KB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">MIME Type:</p>
                    <p className="font-semibold">{encryptionResult.metadata.mimeType}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-600">Checksum:</p>
                  <p className="font-mono text-xs bg-gray-100/80 p-2 rounded break-all">
                    {encryptionResult.metadata.checksum}
                  </p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Key Management Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          {!keyManagerInitialized ? (
            <GlassCard className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Key className="text-blue-600" />
                Initialize Key Manager
              </h3>
              
              <div className="space-y-4">
                <Input
                  label="Master Password"
                  type="password"
                  value={masterPassword}
                  onChange={setMasterPassword}
                  placeholder="Enter master password (min 12 characters)"
                  required
                />
                
                <Button
                  variant="primary"
                  onClick={initializeKeyManager}
                  disabled={loading || masterPassword.length < 12}
                  className="w-full"
                >
                  {loading ? 'Initializing...' : 'Initialize Key Manager'}
                </Button>
                
                <div className="text-sm text-gray-600 bg-yellow-50/80 p-3 rounded-lg">
                  <p><strong>Security Requirements:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Minimum 12 characters</li>
                    <li>Must contain uppercase, lowercase, numbers, and special characters</li>
                    <li>This password encrypts all your keys - keep it secure!</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Generate New Key</h3>
                  
                  <div className="space-y-4">
                    <Input
                      label="Key Name"
                      value={newKeyName}
                      onChange={setNewKeyName}
                      placeholder="Enter key name"
                      required
                    />
                    
                    <Input
                      label="Purpose"
                      value={newKeyPurpose}
                      onChange={setNewKeyPurpose}
                      placeholder="e.g., Customer data encryption"
                      required
                    />
                    
                    <Input
                      label="Owner"
                      value={newKeyOwner}
                      onChange={setNewKeyOwner}
                      placeholder="Enter owner name"
                      required
                    />
                    
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        onClick={generateSymmetricKey}
                        disabled={loading || !newKeyName || !newKeyPurpose || !newKeyOwner}
                        className="flex-1"
                      >
                        Generate Symmetric Key
                      </Button>
                      
                      <Button
                        variant="secondary"
                        onClick={generateAsymmetricKeyPair}
                        disabled={loading || !newKeyName || !newKeyPurpose || !newKeyOwner}
                        className="flex-1"
                      >
                        Generate Key Pair
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Key Statistics</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50/80 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{keys.length}</p>
                      <p className="text-sm text-blue-800">Total Keys</p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50/80 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {keys.filter(k => k.type === 'symmetric').length}
                      </p>
                      <p className="text-sm text-green-800">Symmetric Keys</p>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50/80 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {keys.filter(k => k.type === 'asymmetric').length}
                      </p>
                      <p className="text-sm text-purple-800">Key Pairs</p>
                    </div>
                    
                    <div className="text-center p-4 bg-orange-50/80 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {keys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
                      </p>
                      <p className="text-sm text-orange-800">Expiring Soon</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              <GlassCard className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Stored Keys</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Algorithm</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Purpose</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Owner</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((key) => (
                        <tr key={key.id} className="border-b border-gray-100 hover:bg-white/50">
                          <td className="py-3 px-4 font-medium">{key.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              key.type === 'symmetric' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {key.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm">{key.algorithm}</td>
                          <td className="py-3 px-4">{key.metadata.purpose}</td>
                          <td className="py-3 px-4">{key.metadata.owner}</td>
                          <td className="py-3 px-4 text-sm">{new Date(key.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => deleteKey(key.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {keys.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No keys found. Generate your first key to get started.
                    </div>
                  )}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      )}

      {/* Digital Signatures Tab */}
      {activeTab === 'signature' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="text-blue-600" />
              Create Digital Signature
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data to Sign
                </label>
                <textarea
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter data to sign..."
                />
              </div>
              
              <Button
                variant="secondary"
                onClick={generateKeyPair}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Generating...' : 'Generate New Key Pair'}
              </Button>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="w-full h-24 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
                  placeholder="Private key for signing..."
                />
              </div>
              
              <Button
                variant="primary"
                onClick={createSignature}
                disabled={!signatureData || !privateKey}
                className="w-full"
              >
                Create Signature
              </Button>
              
              {signature && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Digital Signature
                  </label>
                  <textarea
                    value={signature}
                    readOnly
                    className="w-full h-24 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-gray-50/80 font-mono text-xs"
                  />
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              Verify Digital Signature
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Data
                </label>
                <textarea
                  value={signatureData}
                  onChange={(e) => setSignatureData(e.target.value)}
                  className="w-full h-32 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Enter original data..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Public Key
                </label>
                <textarea
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  className="w-full h-24 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
                  placeholder="Public key for verification..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature to Verify
                </label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full h-24 px-4 py-2 border border-white/50 rounded-xl backdrop-blur-md bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono text-xs"
                  placeholder="Signature to verify..."
                />
              </div>
              
              <Button
                variant="success"
                onClick={verifySignature}
                disabled={!signatureData || !publicKey || !signature}
                className="w-full"
              >
                Verify Signature
              </Button>
              
              {verificationResult !== null && (
                <div className={`p-4 rounded-lg border ${
                  verificationResult 
                    ? 'bg-green-50/80 border-green-200 text-green-800' 
                    : 'bg-red-50/80 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {verificationResult ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {verificationResult ? 'Signature Valid' : 'Signature Invalid'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">
                    {verificationResult 
                      ? 'The signature is authentic and the data has not been tampered with.'
                      : 'The signature is invalid or the data has been modified.'
                    }
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};