import { Customer } from '../types';

export interface CSVCustomerData {
  rankAndName: string;
  unit: string;
  qtrNo: string;
  catering: number;
  subscription: number;
  wine: number;
  partyShare: number;
  arrears: number;
  lateFees: number;
  securityDeposit: number;
  patientComfortFund: number;
  total: number;
  advance: number;
  balance: number;
  // Additional fields from CSV
  [key: string]: any;
}

export interface DropdownOption {
  value: string;
  label: string;
  type: 'rank' | 'name' | 'unit' | 'quarter';
}

export class CSVDataRetriever {
  private csvData: CSVCustomerData[] = [];
  private isLoaded = false;

  constructor() {
    this.loadCSVData();
  }

  private async loadCSVData(): Promise<void> {
    try {
      const response = await fetch('/Book1.csv');
      const csvText = await response.text();
      this.parseCSVData(csvText);
      this.isLoaded = true;
    } catch (error) {
      console.error('Error loading CSV file:', error);
      throw new Error('Failed to load Book1.csv file. Please ensure the file exists in the public directory.');
    }
  }

  private parseCSVData(csvText: string): void {
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Skip header row and parse data
    const dataLines = lines.slice(1);
    
    this.csvData = dataLines.map((line, index) => {
      const values = this.parseCSVLine(line);
      
      if (values.length < 14) {
        console.warn(`Row ${index + 2}: Insufficient data columns`);
        return null;
      }

      try {
        return {
          rankAndName: values[0]?.trim() || '',
          unit: values[1]?.trim() || '',
          qtrNo: values[2]?.trim() || '',
          catering: this.parseNumber(values[3]),
          subscription: this.parseNumber(values[4]),
          wine: this.parseNumber(values[5]),
          partyShare: this.parseNumber(values[6]),
          arrears: this.parseNumber(values[7]),
          lateFees: this.parseNumber(values[8]),
          securityDeposit: this.parseNumber(values[9]),
          patientComfortFund: this.parseNumber(values[10]),
          total: this.parseNumber(values[11]),
          advance: this.parseNumber(values[12]),
          balance: this.parseNumber(values[13]),
          rawData: values
        };
      } catch (error) {
        console.warn(`Error parsing row ${index + 2}:`, error);
        return null;
      }
    }).filter(Boolean) as CSVCustomerData[];
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current);
    return values;
  }

  private parseNumber(value: string): number {
    if (!value || value.trim() === '') return 0;
    const num = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // Get unique customer ranks
  getCustomerRanks(): DropdownOption[] {
    if (!this.isLoaded) return [];
    
    const ranks = new Set<string>();
    
    this.csvData.forEach(record => {
      if (record.rankAndName) {
        // Extract rank from "RANK NAME" format
        const parts = record.rankAndName.split(' ');
        if (parts.length > 1) {
          const rank = parts[0];
          if (rank && rank !== 'TOTAL' && rank !== 'Party' && rank !== 'WINE') {
            ranks.add(rank);
          }
        }
      }
    });

    return Array.from(ranks)
      .sort()
      .map(rank => ({
        value: rank,
        label: rank,
        type: 'rank' as const
      }));
  }

  // Get unique customer names
  getCustomerNames(): DropdownOption[] {
    if (!this.isLoaded) return [];
    
    const names = new Set<string>();
    
    this.csvData.forEach(record => {
      if (record.rankAndName && record.rankAndName.trim()) {
        // Skip summary rows
        if (!record.rankAndName.includes('TOTAL') && 
            !record.rankAndName.includes('Party share') &&
            !record.rankAndName.includes('WINE') &&
            record.rankAndName !== 'NEW MEMBER') {
          names.add(record.rankAndName);
        }
      }
    });

    return Array.from(names)
      .sort()
      .map(name => ({
        value: name,
        label: name,
        type: 'name' as const
      }));
  }

  // Get unique unit numbers
  getUnitNumbers(): DropdownOption[] {
    if (!this.isLoaded) return [];
    
    const units = new Set<string>();
    
    this.csvData.forEach(record => {
      if (record.unit && record.unit.trim()) {
        units.add(record.unit);
      }
    });

    return Array.from(units)
      .sort()
      .map(unit => ({
        value: unit,
        label: unit,
        type: 'unit' as const
      }));
  }

  // Get unique quarter numbers
  getQuarterNumbers(): DropdownOption[] {
    if (!this.isLoaded) return [];
    
    const quarters = new Set<string>();
    
    this.csvData.forEach(record => {
      if (record.qtrNo && record.qtrNo.trim()) {
        quarters.add(record.qtrNo);
      }
    });

    return Array.from(quarters)
      .sort()
      .map(quarter => ({
        value: quarter,
        label: quarter,
        type: 'quarter' as const
      }));
  }

  // Get customer data by name
  getCustomerByName(customerName: string): CSVCustomerData | null {
    if (!this.isLoaded) return null;
    
    return this.csvData.find(record => 
      record.rankAndName === customerName
    ) || null;
  }

  // Get customers by rank
  getCustomersByRank(rank: string): CSVCustomerData[] {
    if (!this.isLoaded) return [];
    
    return this.csvData.filter(record => 
      record.rankAndName.startsWith(rank + ' ')
    );
  }

  // Get customers by unit
  getCustomersByUnit(unit: string): CSVCustomerData[] {
    if (!this.isLoaded) return [];
    
    return this.csvData.filter(record => 
      record.unit === unit
    );
  }

  // Get customers by quarter
  getCustomersByQuarter(quarter: string): CSVCustomerData[] {
    if (!this.isLoaded) return [];
    
    return this.csvData.filter(record => 
      record.qtrNo === quarter
    );
  }

  // Check if data is loaded
  isDataLoaded(): boolean {
    return this.isLoaded;
  }

  // Get all data
  getAllData(): CSVCustomerData[] {
    return this.csvData;
  }

  // Convert CSV data to Customer format for compatibility
  convertToCustomer(csvData: CSVCustomerData): Customer {
    // Extract rank and name
    const parts = csvData.rankAndName.split(' ');
    const rank = parts[0];
    const name = parts.slice(1).join(' ');
    
    // Determine customer rank category
    let customerRank: Customer['rank'] = 'Bronze';
    if (rank.includes('CMDE') || rank.includes('CAPT')) {
      customerRank = 'Platinum';
    } else if (rank.includes('CDR') || rank.includes('LT CDR')) {
      customerRank = 'Gold';
    } else if (rank.includes('LT') || rank.includes('SLT')) {
      customerRank = 'Silver';
    }

    return {
      id: `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || csvData.rankAndName,
      rank: customerRank,
      contact: '000-000-0000', // Default contact as CSV doesn't have this
      email: undefined,
      address: csvData.unit || undefined,
      createdAt: new Date()
    };
  }
}

// Create singleton instance
export const csvDataRetriever = new CSVDataRetriever();