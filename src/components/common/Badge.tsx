import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  dot = false
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold'
  };

  const variantStyles = {
    neutral: 'bg-slate-800/90 text-slate-300 border border-slate-700/60',
    primary: 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60',
    success: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60',
    warning: 'bg-amber-950/80 text-amber-300 border border-amber-800/60',
    danger: 'bg-rose-950/80 text-rose-300 border border-rose-800/60',
    info: 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60',
    purple: 'bg-purple-950/80 text-purple-300 border border-purple-800/60',
    amber: 'bg-orange-950/80 text-orange-300 border border-orange-800/60'
  };

  const dotColor = {
    neutral: 'bg-slate-400',
    primary: 'bg-indigo-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-cyan-400',
    purple: 'bg-purple-400',
    amber: 'bg-orange-400'
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[variant]}`} />}
      {children}
    </span>
  );
};
