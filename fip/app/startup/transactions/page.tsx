"use client"

import { Button } from "@/components/ui/button"
import { Bell, User } from "lucide-react"
import { MetricCard } from "@/components/startup/cards/metric-card"
import { SimpleAreaChart } from "@/components/startup/charts/area-chart"
import { DonutChart } from "@/components/startup/charts/donut-chart"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TransactionsPage() {
  return (
    <div className="p-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactional Analytics</h1>
          <p className="text-muted-foreground">Detailed insight per feature and per applications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center relative">
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">2</div>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <span className="text-xs">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Button variant="secondary" className="bg-muted/10 h-8 text-xs">Application: All</Button>
        <Button variant="secondary" className="bg-muted/10 h-8 text-xs">Feature: All</Button>
        <div className="flex bg-muted/10 rounded-lg p-1">
          <button className="px-3 py-0.5 text-xs bg-white rounded shadow-sm text-foreground">Daily</button>
          <button className="px-3 py-0.5 text-xs text-muted-foreground hover:bg-white/50 rounded">Weekly</button>
          <button className="px-3 py-0.5 text-xs text-muted-foreground hover:bg-white/50 rounded">Monthly</button>
        </div>
      </div>


      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard title="Total Transaction Volume" value="1,234,567" change="+5.2%" trend="up" />
        <MetricCard title="Average Gas Paid" value="0.0012 ETH" change="+5.2%" trend="down" /> {/* Red Down icon for gas fee increase means bad? Usually red is bad. */}
        <MetricCard title="Fee Paid" value="1,234" change="+3.1%" trend="up" />
        <MetricCard title="Revenue" value="98,734" change="+8.1%" trend="up" />
      </div>


      <div className="grid grid-cols-3 gap-6">
        {/* Total Vol Area Chart */}
        <div className="col-span-2 rounded-xl border bg-card p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Total Transaction Volume</h3>
          </div>
          <div className="h-64">
            <SimpleAreaChart color="#22c55e" showAxes={true} showGrid={false} />
          </div>
        </div>

        {/* Failed Transaction Donut - The design shows "Failed Transaction Limits" and a donut with Gas Limits, Revert, Other */}
        <div className="col-span-1 rounded-xl border bg-card p-6">
          <div className="mb-8">
            <h3 className="font-semibold text-sm">Failed Transaction Limits</h3>
          </div>
          <DonutChart
            data={[
              { name: "Gas Limits", value: 60, color: "#3b82f6" }, // Blue
              { name: "Revert", value: 20, color: "#ef4444" }, // Red
              { name: "Other", value: 20, color: "#fbbf24" } // Yellow
            ]}
            innerRadius={60}
            outerRadius={80}
          />
          <div className="flex justify-center gap-4 text-[10px] mt-8">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Gas Limits</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Revert</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Other</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Average Gas Fee */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Average of gas Fee Over Time</h3>
          </div>
          <div className="h-64 relative">
            {/* Using Area Chart to mimic nice curve */}
            <SimpleAreaChart color="#22c55e" showAxes={false} showGrid={false} />
            <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Top Wallets Table */}
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-sm">Top 10 Revenue Wallets</h3>
          </div>
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="font-medium text-xs text-muted-foreground w-12">Rank</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Wallet</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Revenue</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground text-right">TXN Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { rank: 1, wallet: "0x1A2b....c3D4", rev: "$12,345.78", cnt: 345 },
                { rank: 2, wallet: "0x3c67....x4e5", rev: "$9,876.45", cnt: 210 },
                { rank: 3, wallet: "0xer2b....z8e4", rev: "$8,123.45", cnt: 188 },
                { rank: 4, wallet: "0x2A1b....n7D3", rev: "$7,543.21", cnt: 150 },
                { rank: 5, wallet: "0x2A1b....n7D3", rev: "$7,543.21", cnt: 150 },
                { rank: 6, wallet: "0x2A1b....n7D3", rev: "$7,543.21", cnt: 150 },
              ].map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs text-muted-foreground">{item.rank}</TableCell>
                  <TableCell className="text-xs font-medium">{item.wallet}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.rev}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right">{item.cnt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
