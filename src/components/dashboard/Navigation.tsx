import React from 'react';
import { Users, FileText, DollarSign, Settings } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="backdrop-blur-md bg-white/85 border-b border-white/50 p-4">
      <div className="flex space-x-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                transition-all duration-300 hover:scale-105
                ${activeTab === tab.id
                  ? 'bg-blue-500/80 text-white shadow-lg'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80'
                }
              `}
            >
              <Icon size={20} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};