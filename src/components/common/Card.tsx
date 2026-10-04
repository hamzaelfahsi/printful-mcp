import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = false
}) => {
  const hoverStyles = hoverEffect
    ? 'hover:border-slate-700/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer transition-all duration-200'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/90 border border-slate-800/80 rounded-2xl backdrop-blur-sm p-5 text-slate-100 shadow-sm shadow-black/20 ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
};
