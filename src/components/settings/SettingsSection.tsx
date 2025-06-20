import React, { useState } from 'react';
import { Settings, Save, Download, Upload, Shield, FileText, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { SecuritySettings } from './SecuritySettings';
import { EncryptionManager } from '../security/EncryptionManager';
import { storageService } from '../../utils/storage';
import { csvParser, CSVImportResult } from '../../utils/csvParser';

export const SettingsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    companyName: 'ZenithBill Restaurant',
    address: '123 Restaurant Street, Food City',
    phone: '+1 234 567 8900',
    email: 'info@zenithbill.com',
    taxId: 'TAX123456789',
    currency: 'INR',
    autoSaveInterval: '30'
  });

  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleSave = () => {
    localStorage.setItem('zenithbill_settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleExportData = () => {
    const data = {
      customers: localStorage.getItem('zenithbill_customers'),
      bills: localStorage.getItem('zenithbill_bills'),
      settings: localStorage.getItem('zenithbill_settings')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenithbill-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.customers) localStorage.setItem('zenithbill_customers', data.customers);
        if (data.bills) localStorage.setItem('zenithbill_bills', data.bills);
        if (data.settings) localStorage.setItem('zenithbill_settings', data.settings);
        
        alert('Data imported successfully! Please refresh the application.');
      } catch (error) {
        alert('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportResult({
        success: false,
        message: 'Please select a CSV file'
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('customer') || fileName === 'book1.csv') {
          const result = csvParser.importCustomers(csvContent);
          
          if (result.success && result.data) {
            result.data.forEach(customer => {
              storageService.saveCustomer(customer);
            });
          }
          
          setImportResult(result);
        } else if (fileName.includes('bill')) {
          const customers = storageService.getCustomers();
          const result = csvParser.importBills(csvContent, customers);
          
          if (result.success && result.data) {
            console.log('Bills imported:', result.data);
          }
          
          setImportResult(result);
        } else {
          const result = csvParser.importCustomers(csvContent);
          
          if (result.success && result.data) {
            result.data.forEach(customer => {
              storageService.saveCustomer(customer);
            });
          }
          
          setImportResult(result);
        }
        
      } catch (error) {
        setImportResult({
          success: false,
          message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.readAsText(file);
  };

  const downloadTemplate = (type: 'customer' | 'bill') => {
    const template = type === 'customer' 
      ? csvParser.generateCustomerTemplate()
      : csvParser.generateBillTemplate();
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'encryption', label: 'Encryption', icon: Lock }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Settings</h2>
        {activeTab === 'general' && (
          <Button variant="primary" icon={Save} onClick={handleSave}>
            Save Settings
          </Button>
        )}
      </div>

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

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Company Information */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings />
              Company Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={settings.companyName}
                onChange={(value) => setSettings({ ...settings, companyName: value })}
              />
              
              <Input
                label="Phone Number"
                value={settings.phone}
                onChange={(value) => setSettings({ ...settings, phone: value })}
              />
              
              <Input
                label="Email Address"
                type="email"
                value={settings.email}
                onChange={(value) => setSettings({ ...settings, email: value })}
              />
              
              <Input
                label="Tax ID"
                value={settings.taxId}
                onChange={(value) => setSettings({ ...settings, taxId: value })}
              />
              
              <div className="md:col-span-2">
                <Input
                  label="Company Address"
                  value={settings.address}
                  onChange={(value) => setSettings({ ...settings, address: value })}
                />
              </div>
            </div>
          </GlassCard>

          {/* System Settings */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield />
              System Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Currency"
                value={settings.currency}
                onChange={(value) => setSettings({ ...settings, currency: value })}
              />
              
              <Input
                label="Auto-save Interval (seconds)"
                type="number"
                value={settings.autoSaveInterval}
                onChange={(value) => setSettings({ ...settings, autoSaveInterval: value })}
              />
            </div>
          </GlassCard>

          {/* CSV Import Section */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText />
              CSV Import
            </h3>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Import customer data or billing information from CSV files. 
                You can upload "book1.csv" or any properly formatted CSV file.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    disabled={isImporting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <Button 
                    variant="primary" 
                    icon={Upload}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import CSV File'}
                  </Button>
                </div>
                
                <Button 
                  variant="secondary" 
                  icon={Download}
                  onClick={() => downloadTemplate('customer')}
                >
                  Download Customer Template
                </Button>
                
                <Button 
                  variant="secondary" 
                  icon={Download}
                  onClick={() => downloadTemplate('bill')}
                >
                  Download Bill Template
                </Button>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`p-4 rounded-lg border ${
                  importResult.success 
                    ? 'bg-green-50/80 border-green-200 text-green-800' 
                    : 'bg-red-50/80 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {importResult.success ? 'Import Successful' : 'Import Failed'}
                    </span>
                  </div>
                  
                  <p className="mb-2">{importResult.message}</p>
                  
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">CSV Format Guidelines:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Customer CSV:</strong> Name, Rank, Contact, Email, Address</p>
                  <p><strong>Bill CSV:</strong> CustomerName, UnitNumber, QuarterNumber, CateringCharges, Subscription, WinePurchases, PartyShare, Arrears, SecurityDeposit, AnupmaCharges, AdvanceSecurityDeposit</p>
                  <p><strong>Note:</strong> First row should contain column headers</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Data Management */}
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Data Management</h3>
            
            <div className="flex flex-wrap gap-4">
              <Button variant="secondary" icon={Download} onClick={handleExportData}>
                Export Data
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="secondary" icon={Upload}>
                  Import Data
                </Button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50/80 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Always backup your data before importing. 
                Importing will overwrite existing data.
              </p>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'security' && <SecuritySettings />}

      {/* Encryption Manager Tab */}
      {activeTab === 'encryption' && <EncryptionManager />}
    </div>
  );
};