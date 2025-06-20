import React, { useState, useEffect } from 'react';
import { Calculator, Download, Share, Save, Plus, Database } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { CSVDataSelector } from './CSVDataSelector';
import { Bill, BillItem, Customer, User } from '../../types';
import { storageService } from '../../utils/storage';
import { generateBillNumber, validateNumeric } from '../../utils/validation';
import { CSVCustomerData, csvDataRetriever } from '../../utils/csvDataParser';

interface BillingSystemProps {
  user: User;
}

export const BillingSystem: React.FC<BillingSystemProps> = ({ user }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [csvCustomerData, setCsvCustomerData] = useState<CSVCustomerData | null>(null);
  const [showCSVSelector, setShowCSVSelector] = useState(false);
  const [billData, setBillData] = useState<Partial<Bill>>({
    billNumber: generateBillNumber(),
    date: new Date(),
    unitNumber: 0,
    quarterNumber: 0,
    items: {
      cateringCharges: 0,
      subscription: 0,
      winePurchases: 0,
      partyShare: 0,
      arrears: 0,
      securityDeposit: 0,
      anupmaCharges: 0,
      advanceSecurityDeposit: 0
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [csvError, setCsvError] = useState<string>('');
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomers();
    
    // Auto-save every 30 seconds
    const interval = setInterval(() => {
      if (selectedCustomer && billData.items) {
        saveDraft();
      }
    }, 30000);
    
    setAutoSaveInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedCustomer, billData]);

  const loadCustomers = () => {
    const loadedCustomers = storageService.getCustomers();
    setCustomers(loadedCustomers);
  };

  const saveDraft = () => {
    // Auto-save functionality
    console.log('Auto-saving draft...');
  };

  const handleCSVCustomerSelect = (csvData: CSVCustomerData) => {
    setCsvCustomerData(csvData);
    setCsvError('');
    
    // Convert CSV data to Customer format and auto-populate bill
    const customer = csvDataRetriever.convertToCustomer(csvData);
    setSelectedCustomer(customer);
    
    // Auto-populate bill data from CSV
    setBillData({
      ...billData,
      unitNumber: parseInt(csvData.qtrNo) || 0,
      quarterNumber: parseInt(csvData.qtrNo) || 0,
      items: {
        cateringCharges: csvData.catering || 0,
        subscription: csvData.subscription || 0,
        winePurchases: csvData.wine || 0,
        partyShare: csvData.partyShare || 0,
        arrears: csvData.arrears || 0,
        securityDeposit: csvData.securityDeposit || 0,
        anupmaCharges: csvData.patientComfortFund || 0,
        advanceSecurityDeposit: csvData.advance || 0
      }
    });
  };

  const handleCSVError = (error: string) => {
    setCsvError(error);
  };

  const handleItemChange = (field: keyof BillItem, value: string) => {
    const numValue = parseFloat(value) || 0;
    const maxValues = {
      cateringCharges: 999999.99,
      subscription: 99999.99,
      winePurchases: 999999.99,
      partyShare: 99999.99,
      arrears: 999999.99,
      securityDeposit: 999999.99,
      anupmaCharges: 99999.99,
      advanceSecurityDeposit: 999999.99
    };

    if (!validateNumeric(value, maxValues[field])) {
      setErrors({ ...errors, [field]: `Value must be between 0 and ${maxValues[field]}` });
      return;
    }

    setErrors({ ...errors, [field]: '' });
    
    const newItems = { ...billData.items!, [field]: numValue };
    setBillData({ ...billData, items: newItems });
  };

  const calculateTotals = () => {
    if (!billData.items) return { totalA: 0, totalB: 0, payableAmount: 0 };

    const totalA = billData.items.cateringCharges +
                   billData.items.subscription +
                   billData.items.winePurchases +
                   billData.items.partyShare +
                   billData.items.arrears +
                   billData.items.securityDeposit +
                   billData.items.anupmaCharges;

    const totalB = billData.items.advanceSecurityDeposit;
    const payableAmount = totalA - totalB;

    return { totalA, totalB, payableAmount };
  };

  const handleSaveBill = () => {
    if (!selectedCustomer || !billData.items) {
      alert('Please select a customer and fill in the bill details.');
      return;
    }

    const { totalA, totalB, payableAmount } = calculateTotals();
    
    const bill: Bill = {
      id: Date.now().toString(),
      billNumber: billData.billNumber!,
      date: billData.date!,
      unitNumber: billData.unitNumber!,
      quarterNumber: billData.quarterNumber!,
      customer: selectedCustomer,
      items: billData.items,
      totalA,
      totalB,
      payableAmount,
      createdBy: user.id,
      createdAt: new Date()
    };

    storageService.saveBill(bill);
    alert('Bill saved successfully!');
    
    // Reset form
    setBillData({
      billNumber: generateBillNumber(),
      date: new Date(),
      unitNumber: 0,
      quarterNumber: 0,
      items: {
        cateringCharges: 0,
        subscription: 0,
        winePurchases: 0,
        partyShare: 0,
        arrears: 0,
        securityDeposit: 0,
        anupmaCharges: 0,
        advanceSecurityDeposit: 0
      }
    });
    setSelectedCustomer(null);
    setCsvCustomerData(null);
  };

  const handleExportPDF = () => {
    alert('PDF export functionality will be implemented with jsPDF library');
  };

  const handleShareWhatsApp = () => {
    if (!selectedCustomer) {
      alert('Please select a customer first.');
      return;
    }

    const { totalA, totalB, payableAmount } = calculateTotals();
    const message = `ZenithBill Invoice
Bill No: ${billData.billNumber}
Customer: ${selectedCustomer.name}
Total Amount: ₹${payableAmount.toFixed(2)}
Date: ${new Date().toLocaleDateString()}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${selectedCustomer.contact.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const { totalA, totalB, payableAmount } = calculateTotals();

  const customerOptions = customers.map(customer => ({
    value: customer.id,
    label: `${customer.name} - ${customer.contact}`
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Billing System</h2>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            icon={Database} 
            onClick={() => setShowCSVSelector(!showCSVSelector)}
          >
            {showCSVSelector ? 'Hide' : 'Show'} CSV Data
          </Button>
          <Button variant="success" icon={Save} onClick={handleSaveBill}>
            Save Bill
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleExportPDF}>
            Export PDF
          </Button>
          <Button variant="primary" icon={Share} onClick={handleShareWhatsApp}>
            Share WhatsApp
          </Button>
        </div>
      </div>

      {/* CSV Error Display */}
      {csvError && (
        <div className="bg-red-50/80 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">CSV Error:</p>
          <p className="text-red-700">{csvError}</p>
        </div>
      )}

      {/* CSV Data Selector */}
      {showCSVSelector && (
        <CSVDataSelector
          onCustomerSelect={handleCSVCustomerSelect}
          onError={handleCSVError}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Header */}
        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Bill Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="Bill Number"
              value={billData.billNumber || ''}
              onChange={(value) => setBillData({ ...billData, billNumber: value })}
              disabled
            />
            
            <Input
              label="Date"
              type="date"
              value={billData.date?.toISOString().split('T')[0] || ''}
              onChange={(value) => setBillData({ ...billData, date: new Date(value) })}
            />
            
            <Input
              label="Unit Number"
              type="number"
              value={billData.unitNumber?.toString() || ''}
              onChange={(value) => setBillData({ ...billData, unitNumber: parseInt(value) || 0 })}
              required
            />
            
            <Input
              label="Quarter Number"
              type="number"
              value={billData.quarterNumber?.toString() || ''}
              onChange={(value) => setBillData({ ...billData, quarterNumber: parseInt(value) || 0 })}
              required
            />
          </div>

          <Select
            label="Select Customer"
            value={selectedCustomer?.id || ''}
            onChange={(value) => {
              const customer = customers.find(c => c.id === value);
              setSelectedCustomer(customer || null);
              setCsvCustomerData(null); // Clear CSV data when manually selecting
            }}
            options={customerOptions}
            required
          />
        </GlassCard>

        {/* Customer Info */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Customer Details</h3>
          
          {selectedCustomer ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-semibold">{selectedCustomer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rank</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedCustomer.rank === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                  selectedCustomer.rank === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                  selectedCustomer.rank === 'Silver' ? 'bg-gray-100 text-gray-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {selectedCustomer.rank}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-semibold">{selectedCustomer.contact}</p>
              </div>
              {selectedCustomer.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedCustomer.email}</p>
                </div>
              )}
              {csvCustomerData && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-blue-600 font-medium">
                    ✓ Data loaded from CSV: {csvCustomerData.rankAndName}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Select a customer to view details</p>
          )}
        </GlassCard>
      </div>

      {/* Billing Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DEBIT Section */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calculator className="text-red-500" />
            DEBIT (Section A)
          </h3>
          
          <div className="space-y-4">
            <Input
              label="Catering Charges"
              type="number"
              value={billData.items?.cateringCharges?.toString() || ''}
              onChange={(value) => handleItemChange('cateringCharges', value)}
              placeholder="0.00"
              error={errors.cateringCharges}
            />
            
            <Input
              label="Subscription"
              type="number"
              value={billData.items?.subscription?.toString() || ''}
              onChange={(value) => handleItemChange('subscription', value)}
              placeholder="0.00"
              error={errors.subscription}
            />
            
            <Input
              label="Wine Purchases"
              type="number"
              value={billData.items?.winePurchases?.toString() || ''}
              onChange={(value) => handleItemChange('winePurchases', value)}
              placeholder="0.00"
              error={errors.winePurchases}
            />
            
            <Input
              label="Party Share"
              type="number"
              value={billData.items?.partyShare?.toString() || ''}
              onChange={(value) => handleItemChange('partyShare', value)}
              placeholder="0.00"
              error={errors.partyShare}
            />
            
            <Input
              label="Arrears"
              type="number"
              value={billData.items?.arrears?.toString() || ''}
              onChange={(value) => handleItemChange('arrears', value)}
              placeholder="0.00"
              error={errors.arrears}
            />
            
            <Input
              label="Security Deposit"
              type="number"
              value={billData.items?.securityDeposit?.toString() || ''}
              onChange={(value) => handleItemChange('securityDeposit', value)}
              placeholder="0.00"
              error={errors.securityDeposit}
            />
            
            <Input
              label="Anupma Charges"
              type="number"
              value={billData.items?.anupmaCharges?.toString() || ''}
              onChange={(value) => handleItemChange('anupmaCharges', value)}
              placeholder="0.00"
              error={errors.anupmaCharges}
            />
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total A:</span>
              <span className="text-red-600">₹{totalA.toFixed(2)}</span>
            </div>
          </div>
        </GlassCard>

        {/* CREDIT Section & Summary */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="text-green-500" />
              CREDIT (Section B)
            </h3>
            
            <Input
              label="Advance Security Deposit"
              type="number"
              value={billData.items?.advanceSecurityDeposit?.toString() || ''}
              onChange={(value) => handleItemChange('advanceSecurityDeposit', value)}
              placeholder="0.00"
              error={errors.advanceSecurityDeposit}
            />
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total B:</span>
                <span className="text-green-600">₹{totalB.toFixed(2)}</span>
              </div>
            </div>
          </GlassCard>

          {/* Final Summary */}
          <GlassCard className="p-6 bg-gradient-to-r from-blue-50/80 to-purple-50/80">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Bill Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Debit (A):</span>
                <span className="font-semibold text-red-600">₹{totalA.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Credit (B):</span>
                <span className="font-semibold text-green-600">₹{totalB.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Payable Amount:</span>
                  <span className={`${payableAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ₹{payableAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};