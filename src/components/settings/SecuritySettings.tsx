import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, AlertTriangle, CheckCircle, Download, Upload } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { SecureStorage } from '../../utils/encryption/secureStorage';
import { KeyManager } from '../../utils/encryption/keyManager';

export const SecuritySettings: React.FC = () => {
  const [secureStorage] = useState(new SecureStorage());
  const [keyManager] = useState(new KeyManager());
  
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [keyRotationInterval, setKeyRotationInterval] = useState('90');
  
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    loadSecuritySettings();
    loadSecurityLogs();
  }, []);

  const showStatus = (type: 'success' | 'error' | 'warning', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  };

  const loadSecuritySettings = () => {
    try {
      const settings = localStorage.getItem('zenithbill_security_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setEncryptionEnabled(parsed.encryptionEnabled || false);
        setAutoBackupEnabled(parsed.autoBackupEnabled || false);
        setKeyRotationInterval(parsed.keyRotationInterval || '90');
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const saveSecuritySettings = () => {
    try {
      const settings = {
        encryptionEnabled,
        autoBackupEnabled,
        keyRotationInterval,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('zenithbill_security_settings', JSON.stringify(settings));
      showStatus('success', 'Security settings saved successfully');
    } catch (error) {
      showStatus('error', 'Failed to save security settings');
    }
  };

  const loadSecurityLogs = () => {
    // In a real implementation, this would load from the SecurityLogger
    const mockLogs = [
      {
        timestamp: new Date(),
        event: 'LOGIN_SUCCESS',
        status: 'success',
        details: { user: 'admin@zenithbill.com' }
      },
      {
        timestamp: new Date(Date.now() - 3600000),
        event: 'KEY_GENERATION',
        status: 'success',
        details: { keyType: 'symmetric' }
      },
      {
        timestamp: new Date(Date.now() - 7200000),
        event: 'DATA_ENCRYPTION',
        status: 'success',
        details: { dataType: 'customer_data' }
      }
    ];
    setSecurityLogs(mockLogs);
  };

  const enableDataEncryption = async () => {
    if (!encryptionPassword) {
      showStatus('error', 'Please enter an encryption password');
      return;
    }

    try {
      // Encrypt existing data
      const customers = localStorage.getItem('zenithbill_customers');
      const bills = localStorage.getItem('zenithbill_bills');
      
      if (customers) {
        await secureStorage.store('customers', JSON.parse(customers), encryptionPassword);
      }
      
      if (bills) {
        await secureStorage.store('bills', JSON.parse(bills), encryptionPassword);
      }
      
      setEncryptionEnabled(true);
      showStatus('success', 'Data encryption enabled successfully');
    } catch (error) {
      showStatus('error', `Failed to enable encryption: ${error.message}`);
    }
  };

  const disableDataEncryption = async () => {
    try {
      // Decrypt and restore data to regular storage
      if (encryptionPassword) {
        const customers = await secureStorage.retrieve('customers', encryptionPassword);
        const bills = await secureStorage.retrieve('bills', encryptionPassword);
        
        localStorage.setItem('zenithbill_customers', JSON.stringify(customers));
        localStorage.setItem('zenithbill_bills', JSON.stringify(bills));
        
        await secureStorage.remove('customers');
        await secureStorage.remove('bills');
      }
      
      setEncryptionEnabled(false);
      showStatus('success', 'Data encryption disabled');
    } catch (error) {
      showStatus('error', `Failed to disable encryption: ${error.message}`);
    }
  };

  const createEncryptedBackup = async () => {
    if (!backupPassword) {
      showStatus('error', 'Please enter a backup password');
      return;
    }

    try {
      const data = {
        customers: localStorage.getItem('zenithbill_customers'),
        bills: localStorage.getItem('zenithbill_bills'),
        settings: localStorage.getItem('zenithbill_settings'),
        timestamp: new Date().toISOString()
      };

      const encryptedData = await secureStorage.store(
        `backup_${Date.now()}`,
        data,
        backupPassword,
        { compressionEnabled: true }
      );

      // Export the backup
      const exportData = await secureStorage.exportData();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenithbill-encrypted-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showStatus('success', 'Encrypted backup created and downloaded');
    } catch (error) {
      showStatus('error', `Failed to create backup: ${error.message}`);
    }
  };

  const restoreFromBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !backupPassword) {
      showStatus('error', 'Please select a backup file and enter the backup password');
      return;
    }

    try {
      const text = await file.text();
      await secureStorage.importData(text);
      
      // Restore the specific backup
      const backupKeys = secureStorage.listKeys().filter(key => key.startsWith('backup_'));
      if (backupKeys.length > 0) {
        const latestBackup = backupKeys.sort().pop();
        if (latestBackup) {
          const data = await secureStorage.retrieve(latestBackup, backupPassword);
          
          if (data.customers) localStorage.setItem('zenithbill_customers', data.customers);
          if (data.bills) localStorage.setItem('zenithbill_bills', data.bills);
          if (data.settings) localStorage.setItem('zenithbill_settings', data.settings);
          
          showStatus('success', 'Backup restored successfully');
        }
      }
    } catch (error) {
      showStatus('error', `Failed to restore backup: ${error.message}`);
    }
  };

  const runSecurityAudit = () => {
    const issues: string[] = [];
    
    // Check password strength
    if (!encryptionPassword || encryptionPassword.length < 12) {
      issues.push('Encryption password should be at least 12 characters long');
    }
    
    // Check if encryption is enabled
    if (!encryptionEnabled) {
      issues.push('Data encryption is not enabled');
    }
    
    // Check backup settings
    if (!autoBackupEnabled) {
      issues.push('Automatic backups are not enabled');
    }
    
    // Check for expired keys
    const keys = keyManager.listKeys();
    const expiredKeys = keys.filter(key => 
      key.expiresAt && new Date(key.expiresAt) < new Date()
    );
    
    if (expiredKeys.length > 0) {
      issues.push(`${expiredKeys.length} encryption keys have expired`);
    }

    if (issues.length === 0) {
      showStatus('success', 'Security audit passed - no issues found');
    } else {
      showStatus('warning', `Security audit found ${issues.length} issues`);
    }
  };

  const intervalOptions = [
    { value: '30', label: '30 days' },
    { value: '60', label: '60 days' },
    { value: '90', label: '90 days' },
    { value: '180', label: '180 days' },
    { value: '365', label: '1 year' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Security Settings</h2>
        <Button variant="secondary" onClick={runSecurityAudit}>
          Run Security Audit
        </Button>
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
             <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold">{status.message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Encryption */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="text-blue-600" />
            Data Encryption
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg">
              <div>
                <p className="font-medium">Encryption Status</p>
                <p className="text-sm text-gray-600">
                  {encryptionEnabled ? 'Data is encrypted' : 'Data is not encrypted'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                encryptionEnabled ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            
            <Input
              label="Encryption Password"
              type="password"
              value={encryptionPassword}
              onChange={setEncryptionPassword}
              placeholder="Enter encryption password"
            />
            
            <div className="flex gap-2">
              <Button
                variant={encryptionEnabled ? "danger" : "primary"}
                onClick={encryptionEnabled ? disableDataEncryption : enableDataEncryption}
                disabled={!encryptionPassword}
                className="flex-1"
              >
                {encryptionEnabled ? 'Disable Encryption' : 'Enable Encryption'}
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 bg-blue-50/80 p-3 rounded-lg">
              <p><strong>Note:</strong> Enabling encryption will secure all customer and billing data. 
              Make sure to remember your encryption password as it cannot be recovered.</p>
            </div>
          </div>
        </GlassCard>

        {/* Backup & Recovery */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="text-green-600" />
            Backup & Recovery
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automatic Backups</p>
                <p className="text-sm text-gray-600">Create encrypted backups automatically</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <Input
              label="Backup Password"
              type="password"
              value={backupPassword}
              onChange={setBackupPassword}
              placeholder="Enter backup password"
            />
            
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={createEncryptedBackup}
                disabled={!backupPassword}
                icon={Download}
                className="flex-1"
              >
                Create Backup
              </Button>
              
              <div className="relative flex-1">
                <input
                  type="file"
                  accept=".json"
                  onChange={restoreFromBackup}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button
                  variant="secondary"
                  icon={Upload}
                  disabled={!backupPassword}
                  className="w-full"
                >
                  Restore Backup
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Key Management */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Key className="text-purple-600" />
            Key Management
          </h3>
          
          <div className="space-y-4">
            <Select
              label="Key Rotation Interval"
              value={keyRotationInterval}
              onChange={setKeyRotationInterval}
              options={intervalOptions}
            />
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50/80 rounded-lg">
                <p className="text-lg font-bold text-blue-600">0</p>
                <p className="text-sm text-blue-800">Active Keys</p>
              </div>
              <div className="p-3 bg-orange-50/80 rounded-lg">
                <p className="text-lg font-bold text-orange-600">0</p>
                <p className="text-sm text-orange-800">Expiring Soon</p>
              </div>
            </div>
            
            <Button variant="secondary" className="w-full">
              Rotate All Keys
            </Button>
          </div>
        </GlassCard>

        {/* Security Monitoring */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Security Monitoring</h3>
          
          <div className="space-y-3">
            <div className="text-sm">
              <p className="font-medium text-gray-700">Recent Security Events</p>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {securityLogs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50/80 rounded">
                    <div>
                      <p className="font-medium text-xs">{log.event}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'success' ? 'bg-green-500' : 
                      log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
            
            <Button variant="secondary" size="sm" className="w-full">
              View Full Security Log
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={saveSecuritySettings}>
          Save Security Settings
        </Button>
      </div>
    </div>
  );
};