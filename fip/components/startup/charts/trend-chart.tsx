"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
    { name: 'Jan', product: 3500, competitor: 3800, median: 3300 },
    { name: 'Feb', product: 3800, competitor: 4500, median: 4200 },
    { name: 'Mar', product: 3700, competitor: 4500, median: 4200 },
    { name: 'Apr', product: 4300, competitor: 4800, median: 4600 },
    { name: 'May', product: 4200, competitor: 4800, median: 4600 },
    { name: 'Jun', product: 4800, competitor: 5800, median: 4200 },
];

export function TrendChart() {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    <Area type="monotone" dataKey="product" stroke="#10B981" fillOpacity={0} />
                    <Area type="monotone" dataKey="competitor" stroke="#EF4444" fillOpacity={0} />
                    <Area type="monotone" dataKey="median" stroke="#F59E0B" strokeDasharray="5 5" fillOpacity={0} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
