"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'M1', A: 100, B: 100, C: 100, D: 100 },
  { name: 'M2', A: 85, B: 75, C: 65, D: 45 },
  { name: 'M3', A: 78, B: 65, C: 60, D: 30 },
  { name: 'M4', A: 75, B: 60, C: 55, D: 20 },
  { name: 'M5', A: 72, B: 55, C: 52, D: 15 },
  { name: 'M6', A: 70, B: 50, C: 50, D: 10 },
  { name: 'M7', A: 68, B: 48, C: 48, D: 8 },
  { name: 'M8', A: 67, B: 45, C: 46, D: 6 },
  { name: 'M9', A: 66, B: 43, C: 45, D: 4 },
  { name: 'M10', A: 65, B: 42, C: 44, D: 3 },
  { name: 'M11', A: 65, B: 41, C: 44, D: 2 },
  { name: 'M12', A: 65, B: 40, C: 44, D: 1 },
];

export function RetentionCurve() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }}
          />
          <Tooltip />
          <Line type="monotone" dataKey="A" stroke="#10B981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="B" stroke="#F59E0B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="C" stroke="#EF4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="D" stroke="#3B82F6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
