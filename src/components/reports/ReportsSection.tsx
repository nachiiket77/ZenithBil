import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Bill } from '../../types';
import { storageService } from '../../utils/storage';

export const ReportsSection: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    filterBills();
  }, [bills, dateRange]);

  const loadBills = () => {
    const loadedBills = storageService.getBills();
    setBills(loadedBills);
  };

  const filterBills = () => {
    let filtered = bills;

    if (dateRange.from) {
      filtered = filtered.filter(bill => 
        new Date(bill.date) >= new Date(dateRange.from)
      );
    }

    if (dateRange.to) {
      filtered = filtered.filter(bill => 
        new Date(bill.date) <= new Date(dateRange.to)
      );
    }

    setFilteredBills(filtered);
  };

  const calculateStats = () => {
    const totalRevenue = filteredBills.reduce((sum, bill) => sum + bill.payableAmount, 0);
    const totalBills = filteredBills.length;
    const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0;
    
    return { totalRevenue, totalBills, averageBill };
  };

  const handleExportReport = () => {
    // Export functionality would be implemented here
    alert('Report export functionality will be implemented');
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Reports & Analytics</h2>
        <Button variant="primary" icon={Download} onClick={handleExportReport}>
          Export Report
        </Button>
      </div>

      {/* Date Range Filter */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Filter Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="From Date"
            type="date"
            value={dateRange.from}
            onChange={(value) => setDateRange({ ...dateRange, from: value })}
          />
          <Input
            label="To Date"
            type="date"
            value={dateRange.to}
            onChange={(value) => setDateRange({ ...dateRange, to: value })}
          />
        </div>
      </GlassCard>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-full mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">₹{stats.totalRevenue.toFixed(2)}</h3>
          <p className="text-gray-600">Total Revenue</p>
        </GlassCard>

        <GlassCard className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-4">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{stats.totalBills}</h3>
          <p className="text-gray-600">Total Bills</p>
        </GlassCard>

        <GlassCard className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-full mb-4">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">₹{stats.averageBill.toFixed(2)}</h3>
          <p className="text-gray-600">Average Bill</p>
        </GlassCard>
      </div>

      {/* Bills Table */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Bills</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Bill Number</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="border-b border-gray-100 hover:bg-white/50">
                  <td className="py-3 px-4 font-mono text-sm">{bill.billNumber}</td>
                  <td className="py-3 px-4">{new Date(bill.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{bill.customer.name}</td>
                  <td className="py-3 px-4 font-semibold">₹{bill.payableAmount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bills found for the selected date range.
          </div>
        )}
      </GlassCard>
    </div>
  );
};