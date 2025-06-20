export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Cashier' | 'Manager';
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  contact: string;
  email?: string;
  address?: string;
  createdAt: Date;
}

export interface BillItem {
  cateringCharges: number;
  subscription: number;
  winePurchases: number;
  partyShare: number;
  arrears: number;
  securityDeposit: number;
  anupmaCharges: number;
  advanceSecurityDeposit: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: Date;
  unitNumber: number;
  quarterNumber: number;
  customer: Customer;
  items: BillItem;
  totalA: number;
  totalB: number;
  payableAmount: number;
  createdBy: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  sessionTimeout: number;
}