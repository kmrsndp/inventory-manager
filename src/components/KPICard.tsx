import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function KPICard({ title, value, icon: Icon, change, changeType = 'neutral' }: KPICardProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-green-500'
      : changeType === 'negative'
      ? 'text-red-500'
      : 'text-gray-500';

  const ChangeIcon =
    changeType === 'positive'
      ? TrendingUp
      : changeType === 'negative'
      ? TrendingDown
      : null;

  return (
    <div className="bg-white shadow-md shadow-gray-100/50 rounded-2xl p-6 space-y-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-gray-500 uppercase tracking-wider">{title}</h3>
        <Icon size={20} className="text-gray-400" />
      </div>
      <div className="text-3xl font-bold text-gray-800">{value}</div>
      {change && (
        <div className="flex items-center text-sm">
          {ChangeIcon && <ChangeIcon size={16} className={`mr-1 ${changeColor}`} />}
          <span className={changeColor}>{change}%</span>
          <span className="ml-1 text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  );
}
