import React, { useState, useEffect } from 'react';
import { Database, Search, User, MapPin, Calendar } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Select } from '../common/Select';
import { csvDataRetriever, CSVCustomerData, DropdownOption } from '../../utils/csvDataParser';

interface CSVDataSelectorProps {
  onCustomerSelect: (customerData: CSVCustomerData) => void;
  onError: (error: string) => void;
}

export const CSVDataSelector: React.FC<CSVDataSelectorProps> = ({
  onCustomerSelect,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customerNames, setCustomerNames] = useState<DropdownOption[]>([]);
  const [customerRanks, setCustomerRanks] = useState<DropdownOption[]>([]);
  const [unitNumbers, setUnitNumbers] = useState<DropdownOption[]>([]);
  const [quarterNumbers, setQuarterNumbers] = useState<DropdownOption[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedRank, setSelectedRank] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');
  
  const [customerData, setCustomerData] = useState<CSVCustomerData | null>(null);

  useEffect(() => {
    loadCSVData();
  }, []);

  const loadCSVData = async () => {
    try {
      setIsLoading(true);
      
      // Wait for CSV data to load
      let attempts = 0;
      while (!csvDataRetriever.isDataLoaded() && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!csvDataRetriever.isDataLoaded()) {
        throw new Error('Failed to load CSV data after timeout');
      }

      // Load dropdown options
      setCustomerNames(csvDataRetriever.getCustomerNames());
      setCustomerRanks(csvDataRetriever.getCustomerRanks());
      setUnitNumbers(csvDataRetriever.getUnitNumbers());
      setQuarterNumbers(csvDataRetriever.getQuarterNumbers());
      
    } catch (error) {
      console.error('Error loading CSV data:', error);
      onError(error instanceof Error ? error.message : 'Failed to load CSV data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerNameChange = (customerName: string) => {
    setSelectedCustomer(customerName);
    
    if (customerName) {
      const data = csvDataRetriever.getCustomerByName(customerName);
      if (data) {
        setCustomerData(data);
        onCustomerSelect(data);
        
        // Auto-populate other fields
        setSelectedRank(data.rankAndName.split(' ')[0] || '');
        setSelectedUnit(data.unit || '');
        setSelectedQuarter(data.qtrNo || '');
      } else {
        setCustomerData(null);
        onError('Customer data not found');
      }
    } else {
      setCustomerData(null);
      setSelectedRank('');
      setSelectedUnit('');
      setSelectedQuarter('');
    }
  };

  const handleRankChange = (rank: string) => {
    setSelectedRank(rank);
    // Clear other selections when rank changes
    setSelectedCustomer('');
    setSelectedUnit('');
    setSelectedQuarter('');
    setCustomerData(null);
  };

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    // Clear other selections when unit changes
    setSelectedCustomer('');
    setSelectedRank('');
    setSelectedQuarter('');
    setCustomerData(null);
  };

  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter);
    // Clear other selections when quarter changes
    setSelectedCustomer('');
    setSelectedRank('');
    setSelectedUnit('');
    setCustomerData(null);
  };

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading CSV data...</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dropdown Selectors */}
      <GlassCard className="p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Database className="text-blue-600" />
          CSV Data Retrieval System
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Customer Rank"
            value={selectedRank}
            onChange={handleRankChange}
            options={customerRanks}
            className="w-full"
          />
          
          <Select
            label="Customer Name"
            value={selectedCustomer}
            onChange={handleCustomerNameChange}
            options={customerNames}
            className="w-full"
          />
          
          <Select
            label="Unit Number"
            value={selectedUnit}
            onChange={handleUnitChange}
            options={unitNumbers}
            className="w-full"
          />
          
          <Select
            label="Quarter Number"
            value={selectedQuarter}
            onChange={handleQuarterChange}
            options={quarterNumbers}
            className="w-full"
          />
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>• Select a <strong>Customer Name</strong> to auto-populate all associated details</p>
          <p>• Use other filters to browse by rank, unit, or quarter</p>
          <p>• Data is retrieved in real-time from Book1.csv</p>
        </div>
      </GlassCard>

      {/* Customer Details Display */}
      {customerData && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="text-green-600" />
            Customer Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Basic Information
              </h4>
              <div>
                <p className="text-sm text-gray-600">Full Name & Rank</p>
                <p className="font-semibold">{customerData.rankAndName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Unit</p>
                <p className="font-semibold">{customerData.unit || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quarter Number</p>
                <p className="font-semibold">{customerData.qtrNo || 'Not specified'}</p>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Financial Details
              </h4>
              <div>
                <p className="text-sm text-gray-600">Catering Charges</p>
                <p className="font-semibold text-blue-600">₹{customerData.catering.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Subscription</p>
                <p className="font-semibold text-blue-600">₹{customerData.subscription.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Wine Purchases</p>
                <p className="font-semibold text-blue-600">₹{customerData.wine.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Arrears</p>
                <p className="font-semibold text-red-600">₹{customerData.arrears.toFixed(2)}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-700 border-b border-gray-200 pb-2">
                Summary
              </h4>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-semibold text-lg text-blue-600">₹{customerData.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Advance</p>
                <p className="font-semibold text-green-600">₹{customerData.advance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance</p>
                <p className={`font-semibold text-lg ${customerData.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ₹{customerData.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Additional Charges</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Party Share</p>
                <p className="font-semibold">₹{customerData.partyShare.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Late Fees</p>
                <p className="font-semibold">₹{customerData.lateFees.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Security Deposit</p>
                <p className="font-semibold">₹{customerData.securityDeposit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Patient Comfort Fund</p>
                <p className="font-semibold">₹{customerData.patientComfortFund.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Data Statistics */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{customerNames.length}</p>
            <p className="text-sm text-gray-600">Total Customers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{customerRanks.length}</p>
            <p className="text-sm text-gray-600">Unique Ranks</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{unitNumbers.length}</p>
            <p className="text-sm text-gray-600">Units</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{quarterNumbers.length}</p>
            <p className="text-sm text-gray-600">Quarters</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};