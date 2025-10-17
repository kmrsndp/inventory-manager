import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray'; // Add color prop
}

export default function KPICard({ title, value, icon: Icon, change, changeType = 'neutral', color = 'gray' }: KPICardProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-green-500'
      : changeType === 'negative'
      ? 'text-red-500'
      : 'text-gray-500';

  const cardColorClass = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
  }[color];

  const iconColorClass = {
    blue: 'text-blue-100',
    green: 'text-green-100',
    amber: 'text-amber-100',
    red: 'text-red-100',
    gray: 'text-gray-100',
  }[color];

  const ChangeIcon =
    changeType === 'positive'
      ? TrendingUp
      : changeType === 'negative'
      ? TrendingDown
      : null;

  return (
    <div className={`relative bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-4 overflow-hidden group hover:shadow-lg hover:scale-[1.01] transition-all duration-200`}>
      <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20 ${cardColorClass} transition-all duration-300 group-hover:scale-125`}></div>
      <div className="flex items-center justify-between z-10 relative">
        <h3 className="text-sm text-gray-500 uppercase tracking-wider">{title}</h3>
        <Icon size={20} className={`${iconColorClass} opacity-70`} />
      </div>
      <div className="text-3xl font-bold text-gray-800 z-10 relative">{value}</div>
      {change && (
        <div className="flex items-center text-sm z-10 relative">
          {ChangeIcon && <ChangeIcon size={16} className={`mr-1 ${changeColor}`} />}
          <span className={changeColor}>{change}%</span>
          <span className="ml-1 text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  );
}
