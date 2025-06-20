import { Customer, Bill, BillItem } from '../types';
import { validateName, validatePhone, validateEmail, generateCustomerId } from './validation';

export interface CSVImportResult {
  success: boolean;
  message: string;
  data?: any[];
  errors?: string[];
}

export const csvParser = {
  // Parse CSV text content
  parseCSV: (csvContent: string): string[][] => {
    const lines = csvContent.split('\n').filter(line => line.trim());
    return lines.map(line => {
      // Simple CSV parsing - handles basic comma separation
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      values.push(current.trim());
      return values;
    });
  },

  // Import customers from CSV
  importCustomers: (csvContent: string): CSVImportResult => {
    try {
      const rows = csvParser.parseCSV(csvContent);
      
      if (rows.length === 0) {
        return { success: false, message: 'CSV file is empty' };
      }

      // Expected format: Name, Rank, Contact, Email, Address
      const header = rows[0];
      const expectedHeaders = ['name', 'rank', 'contact', 'email', 'address'];
      
      // Validate headers (case insensitive)
      const normalizedHeaders = header.map(h => h.toLowerCase().trim());
      const hasValidHeaders = expectedHeaders.some(expected => 
        normalizedHeaders.includes(expected)
      );

      if (!hasValidHeaders) {
        return {
          success: false,
          message: 'Invalid CSV format. Expected headers: Name, Rank, Contact, Email, Address'
        };
      }

      const customers: Customer[] = [];
      const errors: string[] = [];
      const dataRows = rows.slice(1); // Skip header

      dataRows.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed
        
        if (row.length < 3) {
          errors.push(`Row ${rowNumber}: Insufficient data (minimum: name, rank, contact)`);
          return;
        }

        const [name, rank, contact, email = '', address = ''] = row;

        // Validate required fields
        if (!validateName(name)) {
          errors.push(`Row ${rowNumber}: Invalid name "${name}"`);
          return;
        }

        if (!validatePhone(contact)) {
          errors.push(`Row ${rowNumber}: Invalid contact "${contact}"`);
          return;
        }

        const validRanks = ['Bronze', 'Silver', 'Gold', 'Platinum'];
        const normalizedRank = rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase();
        if (!validRanks.includes(normalizedRank)) {
          errors.push(`Row ${rowNumber}: Invalid rank "${rank}". Must be one of: ${validRanks.join(', ')}`);
          return;
        }

        // Validate optional email
        if (email && !validateEmail(email)) {
          errors.push(`Row ${rowNumber}: Invalid email "${email}"`);
          return;
        }

        const customer: Customer = {
          id: generateCustomerId(),
          name: name.trim(),
          rank: normalizedRank as Customer['rank'],
          contact: contact.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          createdAt: new Date()
        };

        customers.push(customer);
      });

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Successfully imported ${customers.length} customers`
          : `Imported ${customers.length} customers with ${errors.length} errors`,
        data: customers,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        success: false,
        message: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  // Import bills from CSV
  importBills: (csvContent: string, customers: Customer[]): CSVImportResult => {
    try {
      const rows = csvParser.parseCSV(csvContent);
      
      if (rows.length === 0) {
        return { success: false, message: 'CSV file is empty' };
      }

      // Expected format: CustomerID/Name, UnitNumber, QuarterNumber, CateringCharges, Subscription, WinePurchases, PartyShare, Arrears, SecurityDeposit, AnupmaCharges, AdvanceSecurityDeposit
      const bills: Partial<Bill>[] = [];
      const errors: string[] = [];
      const dataRows = rows.slice(1); // Skip header

      dataRows.forEach((row, index) => {
        const rowNumber = index + 2;
        
        if (row.length < 11) {
          errors.push(`Row ${rowNumber}: Insufficient data`);
          return;
        }

        const [
          customerIdentifier,
          unitNumber,
          quarterNumber,
          cateringCharges,
          subscription,
          winePurchases,
          partyShare,
          arrears,
          securityDeposit,
          anupmaCharges,
          advanceSecurityDeposit
        ] = row;

        // Find customer
        const customer = customers.find(c => 
          c.id === customerIdentifier || 
          c.name.toLowerCase() === customerIdentifier.toLowerCase()
        );

        if (!customer) {
          errors.push(`Row ${rowNumber}: Customer "${customerIdentifier}" not found`);
          return;
        }

        // Validate and parse numeric values
        const numericFields = {
          unitNumber: parseFloat(unitNumber),
          quarterNumber: parseFloat(quarterNumber),
          cateringCharges: parseFloat(cateringCharges) || 0,
          subscription: parseFloat(subscription) || 0,
          winePurchases: parseFloat(winePurchases) || 0,
          partyShare: parseFloat(partyShare) || 0,
          arrears: parseFloat(arrears) || 0,
          securityDeposit: parseFloat(securityDeposit) || 0,
          anupmaCharges: parseFloat(anupmaCharges) || 0,
          advanceSecurityDeposit: parseFloat(advanceSecurityDeposit) || 0
        };

        // Validate numeric fields
        if (isNaN(numericFields.unitNumber) || isNaN(numericFields.quarterNumber)) {
          errors.push(`Row ${rowNumber}: Invalid unit or quarter number`);
          return;
        }

        const items: BillItem = {
          cateringCharges: numericFields.cateringCharges,
          subscription: numericFields.subscription,
          winePurchases: numericFields.winePurchases,
          partyShare: numericFields.partyShare,
          arrears: numericFields.arrears,
          securityDeposit: numericFields.securityDeposit,
          anupmaCharges: numericFields.anupmaCharges,
          advanceSecurityDeposit: numericFields.advanceSecurityDeposit
        };

        const totalA = items.cateringCharges + items.subscription + items.winePurchases + 
                      items.partyShare + items.arrears + items.securityDeposit + items.anupmaCharges;
        const totalB = items.advanceSecurityDeposit;
        const payableAmount = totalA - totalB;

        const bill: Partial<Bill> = {
          customer,
          unitNumber: numericFields.unitNumber,
          quarterNumber: numericFields.quarterNumber,
          items,
          totalA,
          totalB,
          payableAmount
        };

        bills.push(bill);
      });

      return {
        success: errors.length === 0,
        message: errors.length === 0 
          ? `Successfully imported ${bills.length} bills`
          : `Imported ${bills.length} bills with ${errors.length} errors`,
        data: bills,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        success: false,
        message: `Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  // Generate sample CSV templates
  generateCustomerTemplate: (): string => {
    const header = 'Name,Rank,Contact,Email,Address';
    const sampleData = [
      'John Doe,Gold,+1234567890,john@example.com,123 Main St',
      'Jane Smith,Silver,+0987654321,jane@example.com,456 Oak Ave',
      'Bob Johnson,Bronze,+1122334455,bob@example.com,789 Pine Rd'
    ];
    return [header, ...sampleData].join('\n');
  },

  generateBillTemplate: (): string => {
    const header = 'CustomerName,UnitNumber,QuarterNumber,CateringCharges,Subscription,WinePurchases,PartyShare,Arrears,SecurityDeposit,AnupmaCharges,AdvanceSecurityDeposit';
    const sampleData = [
      'John Doe,101,1,5000,1200,800,500,0,2000,300,1000',
      'Jane Smith,102,1,4500,1200,600,400,200,2000,250,800'
    ];
    return [header, ...sampleData].join('\n');
  }
};