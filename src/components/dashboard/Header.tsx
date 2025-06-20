import React from 'react';
import { LogOut, User, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { User as UserType } from '../../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="backdrop-blur-md bg-white/85 border-b border-white/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 font-poppins">
            ZenithBill
          </h1>
          <p className="text-gray-600">Professional Restaurant Management</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <User size={20} />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Clock size={16} />
            <span className="text-sm">{new Date().toLocaleTimeString()}</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            onClick={onLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};