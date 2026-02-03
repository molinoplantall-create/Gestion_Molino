import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
  description: string;
  trend?: 'up' | 'down';
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  description,
  trend = 'up'
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-100',
      text: 'text-green-700',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      text: 'text-orange-700',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      text: 'text-purple-700',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600'
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-700',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`card-hover border rounded-xl p-5 transition-all duration-200 hover:shadow-sm bg-white border-slate-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl md:text-3xl font-bold mt-2 text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colors.iconBg}`}>
          <Icon size={20} strokeWidth={1.5} className={colors.iconColor} />
        </div>
      </div>

      <div className="flex items-center mt-4 text-sm">
        {trend === 'up' ? (
          <>
            <span className="text-emerald-600 font-semibold flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {change}
            </span>
          </>
        ) : (
          <>
            <span className="text-red-600 font-semibold flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              {change}
            </span>
          </>
        )}
        <span className="text-slate-500 ml-2">{description}</span>
      </div>
    </div>
  );
};

// ✅ EXPORT DEFAULT (esto es lo que necesita tu Dashboard.tsx)
export default StatsCard;