"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const featuresData = [
  { label: "Total Features:", feature: "", value: "5" },
  { label: "Top Features", feature: "Swap", value: "10K calls/week" },
  { label: "Average Features", feature: "Stake", value: "10K calls/week" },
  { label: "Lowest Features", feature: "Bridge", value: "1K calls/week" },
  { label: "Drop-Off Rate", feature: "Bridge", value: "30% abandonment" },
]

const walletStats = [
  { label: "Active Wallet", value: "56,777" },
  { label: "New Wallet", value: "1,200" },
  { label: "Returning Wallet", value: "800" },
  { label: "Active Wallet", value: "56,777" },
]

const chartData = [
  { month: "Jan", value: 10000 },
  { month: "Feb", value: 15000 },
  { month: "Mar", value: 18000 },
  { month: "Apr", value: 25000 },
  { month: "May", value: 30000 },
  { month: "Jun", value: 32000 },
  { month: "Jul", value: 40000 },
  { month: "Aug", value: 50000 },
  { month: "Sep", value: 58000 },
]

export default function ProjectDetailPage() {
  return (
    <div className="p-6">
      <DashboardHeader title="Top Web3 Project" subtitle="Real time analysis across chain" />

      {/* Features Performance */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Features Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <tbody>
              {featuresData.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-3 text-sm text-muted-foreground w-1/3">{row.label}</td>
                  <td className="py-3 text-sm w-1/3">{row.feature}</td>
                  <td className="py-3 text-sm text-right">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Wallet Activity */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Wallet Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {walletStats.map((stat, i) => (
              <div key={i} className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex justify-end mb-4">
            <Select defaultValue="monthly">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}K`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="text-sm">
                            <span className="text-muted-foreground">Active</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Summary</span>
                            <span className="ml-4 font-medium">General View</span>
                          </p>
                          <p className="text-sm">
                            <span className="ml-[72px] font-bold">{(payload[0].value as number).toLocaleString()}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Summary</span>
                            <span className="ml-4 font-medium">General View</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-muted-foreground">Change</span>
                            <span className="ml-4 text-green-500">+23% VS 1week</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#colorValue)"
                  dot={{ fill: "#10B981", strokeWidth: 0, r: 4 }}
                  activeDot={{ fill: "#10B981", strokeWidth: 2, stroke: "#fff", r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
