import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { formatNumber } from '@/utils/formatters';

interface ClientProd {
  name: string;
  total: number;
}

interface Props {
  data: ClientProd[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#f472b6'];

const ClientComparisonChart: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-medium italic">
        Sin datos de producción este mes...
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            width={100}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}
            formatter={(value: number) => [`${formatNumber(value)} sacos`, 'Producción']}
          />
          <Bar 
            dataKey="total" 
            radius={[0, 4, 4, 0]} 
            barSize={24}
            animationDuration={1500}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
            <LabelList 
              dataKey="total" 
              position="right" 
              formatter={(val: number) => formatNumber(val)}
              style={{ fontSize: '10px', fontWeight: 800, fill: '#475569' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ClientComparisonChart;
