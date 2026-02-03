import React from 'react';

const ActivityChart: React.FC = () => {
  const data = [
    { name: 'Molino I', value: 420, color: 'bg-blue-500' },
    { name: 'Molino II', value: 380, color: 'bg-green-500' },
    { name: 'Molino III', value: 290, color: 'bg-orange-500' },
    { name: 'Molino IV', value: 310, color: 'bg-purple-500' },
  ];

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div>
      <div className="space-y-5">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24">
              <span className="text-sm font-medium text-slate-600">{item.name}</span>
            </div>
            <div className="flex-1 ml-4">
              <div className="relative">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="font-medium text-slate-700">{item.value.toLocaleString()} sacos</span>
                  <span>{((item.value / maxValue) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${item.color} transition-all duration-500`}
                    style={{ width: `${(item.value / maxValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center space-x-6 mt-8">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color} mr-2`}></div>
            <span className="text-xs text-slate-500 font-medium">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityChart;