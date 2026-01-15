"use client"

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"

const defaultData = [
  { name: 'Features A', value: 45, color: '#00A3FF' },
  { name: 'Features B', value: 28, color: '#10B981' },
  { name: 'Features C', value: 15, color: '#111827' },
  { name: 'Features D', value: 8, color: '#F59E0B' },
  { name: 'Features E', value: 4, color: '#EF4444' },
]

export function RevenueBreakdown() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={defaultData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <XAxis
          type="number"
          hide
        />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 500, fill: '#6B7280' }}
          width={80}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-sm">
                  <p className="text-[10px] font-bold text-[#111827]">{`${payload[0].value}%`}</p>
                </div>
              )
            }
            return null
          }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={16}
        >
          {defaultData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
