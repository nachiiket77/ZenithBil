import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Customer } from '../../types';
import { storageService } from '../../utils/storage';
import { validateName, validatePhone, validateEmail, validateAddress, generateCustomerId } from '../../utils/validation';

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rank: 'Bronze' as const,
    contact: '',
    email: '',
    address: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    const loadedCustomers = storageService.getCustomers();
    setCustomers(loadedCustomers);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateName(formData.name)) {
      newErrors.name = 'Name must be 2-50 characters long';
    }

    if (!validatePhone(formData.contact)) {
      newErrors.contact = 'Please enter a valid phone number';
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.address && !validateAddress(formData.address)) {
      newErrors.address = 'Address must be less than 200 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const customer: Customer = {
      id: editingCustomer?.id || generateCustomerId(),
      name: formData.name,
      rank: formData.rank,
      contact: formData.contact,
      email: formData.email || undefined,
      address: formData.address || undefined,
      createdAt: editingCustomer?.createdAt || new Date()
    };

    storageService.saveCustomer(customer);
    loadCustomers();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rank: 'Bronze',
      contact: '',
      email: '',
      address: ''
    });
    setErrors({});
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      rank: customer.rank,
      contact: customer.contact,
      email: customer.email || '',
      address: customer.address || ''
    });
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      storageService.deleteCustomer(id);
      loadCustomers();
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const rankOptions = [
    { value: 'Bronze', label: 'Bronze' },
    { value: 'Silver', label: 'Silver' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Platinum', label: 'Platinum' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 font-poppins">Customer Management</h2>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setShowForm(true)}
        >
          Add Customer
        </Button>
      </div>

      <GlassCard className="p-6">
        <div className="mb-4">
          <Input
            label="Search Customers"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, contact, or email..."
            className="max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Contact</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-100 hover:bg-white/50">
                  <td className="py-3 px-4 font-mono text-sm">{customer.id}</td>
                  <td className="py-3 px-4 font-medium">{customer.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.rank === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                      customer.rank === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                      customer.rank === 'Silver' ? 'bg-gray-100 text-gray-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {customer.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4">{customer.contact}</td>
                  <td className="py-3 px-4">{customer.email || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit}
                        onClick={() => handleEdit(customer)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(customer.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No customers found. {searchTerm ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
          </div>
        )}
      </GlassCard>

      {showForm && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          </h3>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Customer Name"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="Enter customer name"
              required
              error={errors.name}
            />

            <Select
              label="Customer Rank"
              value={formData.rank}
              onChange={(value) => setFormData({ ...formData, rank: value as Customer['rank'] })}
              options={rankOptions}
              required
            />

            <Input
              label="Contact Number"
              value={formData.contact}
              onChange={(value) => setFormData({ ...formData, contact: value })}
              placeholder="Enter contact number"
              required
              error={errors.contact}
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData({ ...formData, email: value })}
              placeholder="Enter email address (optional)"
              error={errors.email}
            />

            <div className="md:col-span-2">
              <Input
                label="Address"
                value={formData.address}
                onChange={(value) => setFormData({ ...formData, address: value })}
                placeholder="Enter address (optional)"
                error={errors.address}
              />
            </div>

            <div className="md:col-span-2 flex gap-4">
              <Button type="submit" variant="primary">
                {editingCustomer ? 'Update Customer' : 'Add Customer'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      )}
    </div>
  );
};