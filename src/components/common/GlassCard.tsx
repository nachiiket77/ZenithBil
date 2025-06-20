import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hover = true 
}) => {
  return (
    <div className={`
      backdrop-blur-md bg-white/85 
      border border-white/50 
      rounded-xl shadow-xl
      ${hover ? 'hover:scale-105 transition-all duration-300 hover:shadow-2xl' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};