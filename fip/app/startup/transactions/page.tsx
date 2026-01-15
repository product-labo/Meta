"use client"

import { Button } from "@/components/ui/button"
import { Bell, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SimpleAreaChart } from "@/components/startup/charts/area-chart"
import { DonutChart } from "@/components/startup/charts/donut-chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DashboardHeader } from "@/components/dashboard/header"

export default function TransactionsPage() {
  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <DashboardHeader
        title="Transactional Analytics"
        subtitle="Detailed insight per feature and per applications"
      />

      {/* Filters Bar */}
      <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-gray-100 w-fit">
        <Select defaultValue="all">
          <SelectTrigger className="w-40 h-10 bg-white border-none rounded-xl text-xs font-semibold shadow-sm">
            <SelectValue placeholder="Application: All" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Application: All</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-40 h-10 bg-white border-none rounded-xl text-xs font-semibold shadow-sm">
            <SelectValue placeholder="Feature: All" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Feature: All</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-gray-200 mx-2" />

        <div className="flex bg-gray-100/50 p-1 rounded-xl gap-1">
          <button className="px-5 py-1.5 text-xs font-semibold rounded-lg transition-all hover:bg-white hover:shadow-sm text-[#6B7280] hover:text-[#111827]">Daily</button>
          <button className="px-5 py-1.5 text-xs font-semibold rounded-lg transition-all hover:bg-white hover:shadow-sm text-[#6B7280] hover:text-[#111827]">Weekly</button>
          <button className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-white shadow-sm text-[#111827]">Monthly</button>
        </div>
      </div>

      {/* Metrics Grid (6 columns) */}
      <div className="grid grid-cols-6 gap-5">
        {[
          { title: "Total Transaction Volume", value: "1,234,567", change: "+5.2%", trend: "up", color: "#10B981" },
          { title: "Average Gas Paid", value: "0.0012 ETH", change: "+5.2%", trend: "down", color: "#EF4444" },
          { title: "Fee Paid", value: "1,234", change: "+3.1%", trend: "up", color: "#10B981" },
          { title: "Revenue", value: "98,734", change: "+8.1%", trend: "up", color: "#10B981" },
          { title: "In/Out Flow", value: "1.2M/800K", change: "+350k", trend: "up", color: "#10B981", isNet: true },
          { title: "Failed Transaction", value: "1,234,567", change: "-0.3%", trend: "down", color: "#EF4444" },
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm rounded-2xl bg-white p-5 space-y-3">
            <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{item.title}</div>
            <div className="text-xl font-bold text-[#111827] truncate">{item.value}</div>
            <div className="flex items-center gap-1">
              <span className={`text-[10px] font-bold ${item.trend === 'up' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {item.trend === 'up' ? "↑" : "↓"} {item.change}
              </span>
              {item.isNet && <span className="text-[10px] text-[#9CA3AF] font-bold ml-1">Net</span>}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Row 1: Total Volume (70%) and Failed Transaction Donut (30%) */}
        <div className="col-span-8">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-8">Total Transaction Volume</h3>
            <div className="h-[300px]">
              <SimpleAreaChart
                data={[
                  { name: 'Jan', value: 30 }, { name: 'Feb', value: 45 }, { name: 'Mar', value: 35 },
                  { name: 'Apr', value: 42 }, { name: 'May', value: 68 }, { name: 'Jun', value: 55 },
                  { name: 'Jul', value: 85 }
                ]}
                color="#10B981"
                showAxes={true}
                showGrid={true}
              />
            </div>
          </Card>
        </div>
        <div className="col-span-4">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-8 h-full flex flex-col">
            <h3 className="text-sm font-bold text-[#111827] text-center mb-10">Failed Transaction Limits</h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              <DonutChart
                data={[
                  { name: "Gas Limits", value: 60, color: "#3B82F6" },
                  { name: "Revert", value: 25, color: "#EF4444" },
                  { name: "Other", value: 15, color: "#F59E0B" }
                ]}
                innerRadius={70}
                outerRadius={95}
              />
              <div className="flex justify-center gap-6 text-[10px] font-bold mt-12 w-full">
                <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Gas Limits</div>
                <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Revert</div>
                <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Other</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Row 2: Gas Fee Area (60%) and Top Wallets Table (40%) */}
        <div className="col-span-7">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-8">Average of gas Fee Over Time</h3>
            <div className="h-[300px]">
              <SimpleAreaChart
                data={[
                  { name: '1', value: 20 }, { name: '2', value: 50 }, { name: '3', value: 30 },
                  { name: '4', value: 80 }, { name: '5', value: 40 }, { name: '6', value: 90 }
                ]}
                color="#10B981"
                showAxes={false}
                showGrid={false}
              />
            </div>
          </Card>
        </div>
        <div className="col-span-5">
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6 h-full overflow-hidden">
            <h3 className="text-sm font-bold text-[#111827] mb-6">Top 10 Revenue Wallets</h3>
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-3">Rank</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-3">Wallet</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-3">Revenue</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-3 text-right">TXN Count</TableHead>
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
                    <TableRow key={i} className="border-t border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <TableCell className="text-xs font-bold text-[#111827] py-4">{item.rank}</TableCell>
                      <TableCell className="text-xs font-medium text-[#4B5563] py-4">{item.wallet}</TableCell>
                      <TableCell className="text-xs font-bold text-[#111827] py-4">{item.rev}</TableCell>
                      <TableCell className="text-xs font-medium text-[#4B5563] py-4 text-right">{item.cnt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
