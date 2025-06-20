import { User, Customer, Bill } from '../types';

const STORAGE_KEYS = {
  USERS: 'zenithbill_users',
  CUSTOMERS: 'zenithbill_customers',
  BILLS: 'zenithbill_bills',
  CURRENT_USER: 'zenithbill_current_user',
  SESSION_TIMEOUT: 'zenithbill_session_timeout'
};

export const storageService = {
  // User management
  saveUser: (user: User): void => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const existingIndex = users.findIndex((u: User) => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  authenticateUser: (email: string, password: string): User | null => {
    const users = storageService.getUsers();
    // For demo purposes, we'll use a simple check
    // In production, use proper password hashing
    const user = users.find(u => u.email === email);
    if (user || email === 'admin@zenithbill.com') {
      const authenticatedUser = user || {
        id: 'admin-1',
        email: 'admin@zenithbill.com',
        name: 'System Administrator',
        role: 'Admin' as const,
        createdAt: new Date()
      };
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMEOUT, (Date.now() + 30 * 60 * 1000).toString());
      return authenticatedUser;
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    const timeoutStr = localStorage.getItem(STORAGE_KEYS.SESSION_TIMEOUT);
    
    if (!userStr || !timeoutStr) return null;
    
    const timeout = parseInt(timeoutStr);
    if (Date.now() > timeout) {
      storageService.logout();
      return null;
    }
    
    return JSON.parse(userStr);
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIMEOUT);
  },

  // Customer management
  saveCustomer: (customer: Customer): void => {
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    const existingIndex = customers.findIndex((c: Customer) => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getCustomers: (): Customer[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
  },

  deleteCustomer: (id: string): void => {
    const customers = storageService.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(filtered));
  },

  // Bill management
  saveBill: (bill: Bill): void => {
    const bills = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLS) || '[]');
    const existingIndex = bills.findIndex((b: Bill) => b.id === bill.id);
    if (existingIndex >= 0) {
      bills[existingIndex] = bill;
    } else {
      bills.push(bill);
    }
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  },

  getBills: (): Bill[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLS) || '[]');
  },

  deleteBill: (id: string): void => {
    const bills = storageService.getBills();
    const filtered = bills.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(filtered));
  }
};