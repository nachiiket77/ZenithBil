const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  crypto: {
    generateKeyPair: (keySize) => ipcRenderer.invoke('crypto:generateKeyPair', keySize),
    deriveKey: (password, salt, keyLength) => ipcRenderer.invoke('crypto:deriveKey', password, salt, keyLength),
    encryptText: (plaintext, password, config) => ipcRenderer.invoke('crypto:encryptText', plaintext, password, config),
    decryptText: (encryptionResult, password, config) => ipcRenderer.invoke('crypto:decryptText', encryptionResult, password, config),
    createDigitalSignature: (data, privateKey) => ipcRenderer.invoke('crypto:createDigitalSignature', data, privateKey),
    verifyDigitalSignature: (data, signature, publicKey) => ipcRenderer.invoke('crypto:verifyDigitalSignature', data, signature, publicKey),
    generateSecureHash: (data, algorithm) => ipcRenderer.invoke('crypto:generateSecureHash', data, algorithm),
    randomBytes: (length) => ipcRenderer.invoke('crypto:randomBytes', length)
  }
});