import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  description: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const changeColor = change?.startsWith('+') ? 'text-green-600' : 'text-red-600';
  const ChangeIcon = change?.startsWith('+') ? TrendingUp : TrendingDown;

  return (
    <div className="card-hover bg-white rounded-2xl p-5 border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <div className="flex items-baseline mt-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {change && (
              <span className={`ml-2 text-sm font-medium flex items-center ${changeColor}`}>
                <ChangeIcon size={16} className="mr-1" />
                {change}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        </div>
        
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;