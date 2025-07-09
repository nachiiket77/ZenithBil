const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { generateKeyPair, createSign, createVerify, randomBytes, scrypt, createCipheriv, createDecipheriv, createHash } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Crypto IPC handlers
ipcMain.handle('crypto:generateKeyPair', async (event, keySize = 2048) => {
  return new Promise((resolve, reject) => {
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
        reject(new Error('Failed to generate key pair'));
        return;
      }
      resolve({ publicKey, privateKey });
    });
  });
});

ipcMain.handle('crypto:deriveKey', async (event, password, salt, keyLength) => {
  try {
    const saltBuffer = Buffer.from(salt, 'hex');
    const derivedKey = await scryptAsync(password, saltBuffer, keyLength);
    return derivedKey.toString('hex');
  } catch (error) {
    throw new Error('Failed to derive key from password');
  }
});

ipcMain.handle('crypto:encryptText', async (event, plaintext, password, config) => {
  try {
    const salt = randomBytes(config.saltLength);
    const iv = randomBytes(config.ivLength);
    const key = await scryptAsync(password, salt, config.keyLength);

    const cipher = createCipheriv(config.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = config.algorithm === 'aes-256-gcm' ? cipher.getAuthTag() : undefined;

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag?.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
});

ipcMain.handle('crypto:decryptText', async (event, encryptionResult, password, config) => {
  try {
    const salt = Buffer.from(encryptionResult.salt, 'hex');
    const iv = Buffer.from(encryptionResult.iv, 'hex');
    const key = await scryptAsync(password, salt, config.keyLength);

    const decipher = createDecipheriv(config.algorithm, key, iv);
    
    if (config.algorithm === 'aes-256-gcm' && encryptionResult.tag) {
      const tag = Buffer.from(encryptionResult.tag, 'hex');
      decipher.setAuthTag(tag);
    }

    let decrypted = decipher.update(encryptionResult.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
});

ipcMain.handle('crypto:createDigitalSignature', async (event, data, privateKey) => {
  try {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    
    const signature = sign.sign(privateKey, 'hex');
    return signature;
  } catch (error) {
    throw new Error(`Failed to create digital signature: ${error.message}`);
  }
});

ipcMain.handle('crypto:verifyDigitalSignature', async (event, data, signature, publicKey) => {
  try {
    const verify = createVerify('SHA256');
    verify.update(data);
    verify.end();
    
    const isValid = verify.verify(publicKey, signature, 'hex');
    return isValid;
  } catch (error) {
    throw new Error(`Failed to verify digital signature: ${error.message}`);
  }
});

ipcMain.handle('crypto:generateSecureHash', async (event, data, algorithm = 'sha256') => {
  try {
    const hash = createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to generate hash: ${error.message}`);
  }
});

ipcMain.handle('crypto:randomBytes', async (event, length) => {
  try {
    const bytes = randomBytes(length);
    return bytes.toString('hex');
  } catch (error) {
    throw new Error('Failed to generate secure random bytes');
  }
});