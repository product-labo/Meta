"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { name: 'Jan', transaction: 40, revenue: 10 },
  { name: 'Feb', transaction: 30, revenue: 15 },
  { name: 'Mar', transaction: 65, revenue: 12 },
  { name: 'Apr', transaction: 45, revenue: 18 },
  { name: 'May', transaction: 75, revenue: 16 },
  { name: 'Jun', transaction: 55, revenue: 22 },
  { name: 'Jul', transaction: 80, revenue: 20 },
  { name: 'Aug', transaction: 60, revenue: 25 },
  { name: 'Sep', transaction: 85, revenue: 23 },
  { name: 'Oct', transaction: 70, revenue: 28 },
  { name: 'Nov', transaction: 95, revenue: 30 },
  { name: 'Dec', transaction: 82, revenue: 32 },
]

export function TransactionTrend() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorTransaction" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748B' }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748B' }}
          tickFormatter={(value) => `${value}K`}
        />
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
        />
        <Area
          type="monotone"
          dataKey="transaction"
          stroke="#10B981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorTransaction)"
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#0EA5E9"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRevenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
