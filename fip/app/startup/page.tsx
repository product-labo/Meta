"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SparkLine } from "@/components/startup/charts/spark-line"
import { SimpleAreaChart } from "@/components/startup/charts/area-chart"
import { StackedBarChart } from "@/components/startup/charts/stacked-bar"
import { DonutChart } from "@/components/startup/charts/donut-chart"
import { Bell, User } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/header"

export default function StartupOverviewPage() {
  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      {/* Header */}
      <DashboardHeader
        title="Startup Overview"
        subtitle="Real time analysis across chain"
        showFilters={true}
      />

      {/* Tabs / Filters */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-transparent p-0 gap-6 h-auto border-b w-full justify-start rounded-none">
          <TabsTrigger value="all" className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2 px-2">All</TabsTrigger>
          <TabsTrigger value="swap" className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2 px-2">Swap</TabsTrigger>
          <TabsTrigger value="bridge" className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2 px-2">Bridge</TabsTrigger>
          <TabsTrigger value="transfer" className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2 px-2">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8 pt-6">

          {/* Top Metrics Row */}
          <div className="grid grid-cols-3 gap-6">
            <Card><CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total active wallet</div>
                  <div className="text-3xl font-bold mb-1">1,247</div>
                  <div className="text-xs text-green-500">↑ 12% vs Last 30 Days</div>
                </div>
                <SparkLine data={[{ value: 10 }, { value: 15 }, { value: 12 }, { value: 20 }, { value: 25 }]} color="#22c55e" />
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total volume transaction</div>
                  <div className="text-3xl font-bold mb-1">$123,567</div>
                  <div className="text-xs text-green-500">↑ 12% vs Last 30 Days</div>
                </div>
                <SparkLine data={[{ value: 20 }, { value: 22 }, { value: 25 }, { value: 30 }, { value: 40 }]} color="#22c55e" />
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-3xl font-bold mb-1">$98,765</div>
                  <div className="text-xs text-red-500">↓ 12% vs Last 30 Days</div>
                </div>
                <SparkLine data={[{ value: 40 }, { value: 35 }, { value: 30 }, { value: 25 }, { value: 30 }]} color="#ef4444" />
              </div>
            </CardContent></Card>
          </div>

          {/* Row 2: Retention, Success/Fail, Fee, TAM */}
          <div className="grid grid-cols-2 gap-6">
            <Card><CardContent className="p-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span className="text-foreground font-medium border-b-2 border-primary">Adoption</span>
                <span>Retention</span>
                <span>Churn</span>
              </div>
              <div className="mb-4">
                <div className="text-2xl font-bold">85% Retention</div>
                <div className="text-xs text-green-500">Last 30 Days ↑ 1.2%</div>
              </div>
              <div className="h-40">
                <SimpleAreaChart data={[
                  { name: 'W1', value: 40 }, { name: 'W1.5', value: 60 }, { name: 'W2', value: 55 },
                  { name: 'W2.5', value: 30 }, { name: 'W3', value: 45 }, { name: 'W3.5', value: 25 }, { name: 'W4', value: 65 }
                ]} color="#22c55e" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                <span>Week1</span>
                <span>Week2</span>
                <span>Week3</span>
                <span>Week4</span>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Successful vs Fail Transaction</div>
                <div className="text-2xl font-bold">99.7% Success</div>
                <div className="text-xs text-green-500">Last 30 Days ↑ 1.2%</div>
              </div>
              <div className="h-48">
                <StackedBarChart
                  data={[
                    { name: 'Week1', success: 90, fail: 5 },
                    { name: 'Week2', success: 95, fail: 2 },
                    { name: 'Week3', success: 80, fail: 8 },
                    { name: 'Week4', success: 98, fail: 1 },
                  ]}
                />
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Fee vs Gas Fee Vs Revenue</div>
                <div className="text-2xl font-bold">$98.7K Revenue</div>
                <div className="text-xs text-green-500">Last 30 Days ↑ 1.2%</div>
              </div>
              <div className="h-40">
                {/* Mocking Multi-line chart with AreaChart for now or custom */}
                <SimpleAreaChart
                  color="#eab308"
                  data={[
                    { name: 'W1', value: 30 }, { name: 'W2', value: 50 }, { name: 'W3', value: 40 }, { name: 'W4', value: 60 }
                  ]}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                <span>Week1</span>
                <span>Week2</span>
                <span>Week3</span>
                <span>Week4</span>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="mb-6">
                <div className="text-sm text-muted-foreground">TAM/SAM/SOM</div>
                <div className="text-2xl font-bold">$50B TAM</div>
                <div className="text-xs text-green-500">Last 30 Days ↑ 2.0%</div>
              </div>
              <div className="flex items-end gap-4 h-32 px-4">
                <div className="w-1/3 bg-sky-300 rounded-t h-full flex flex-col justify-end p-2"><span className="text-[10px] block text-center mt-2">Total Addressable</span></div>
                <div className="w-1/3 bg-sky-400 rounded-t h-[60%] flex flex-col justify-end p-2"><span className="text-[10px] block text-center mt-2">Serviceable Available</span></div>
                <div className="w-1/3 bg-sky-500 rounded-t h-[30%] flex flex-col justify-end p-2"><span className="text-[10px] block text-center mt-2">Serviceable Obtainable</span></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Row 3: Features, Top Performing, Churned Features */}
          <div className="grid grid-cols-3 gap-6">
            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-4">Features by Use (Last 30 Days)</div>
              <DonutChart
                data={[
                  { name: "Swap (40%)", value: 40, color: "#3b82f6" },
                  { name: "Bridge (30%)", value: 30, color: "#f97316" },
                  { name: "Transfer (20%)", value: 20, color: "#22c55e" },
                  { name: "Other (10%)", value: 10, color: "#eab308" },
                ]}
              />
              <div className="grid grid-cols-2 gap-2 text-[10px] mt-4">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Swap (40%)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Bridge (30%)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Transfer (20%)</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Other (10%)</div>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-6">Current Top Performing Feature</div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 font-bold">⇄</div>
                <span className="font-bold text-lg">Swap</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-[10px] text-muted-foreground uppercase">DAU</div><div className="font-bold">1.2k</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">WAU</div><div className="font-bold">3.8k</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">MAU</div><div className="font-bold">8.9k</div></div>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-6">Most Churned Features</div>
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-red-100 rounded-lg text-red-600 font-bold">📉</div>
                <span className="font-bold text-lg">Staking</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-[10px] text-muted-foreground uppercase">DAU</div><div className="font-bold">150</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">WAU</div><div className="font-bold">450</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">MAU</div><div className="font-bold">1.1k</div></div>
              </div>
            </CardContent></Card>
          </div>

          {/* Row 4: Table and Flow In/Out */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-sm">Top Countries & Drop-off Rate</h3>
              </div>
              <div className="p-0">
                {['United States', 'Germany', 'United Kingdom', 'Japan', 'Canada'].map((country, i) => (
                  <div key={i} className="flex justify-between p-3 border-b last:border-0 text-xs text-muted-foreground">
                    <span className="w-1/3">{country}</span>
                    <span>1,234</span>
                    <span>256</span>
                    <span className={i === 0 ? "text-red-500" : i === 3 ? "text-green-500" : "text-red-500"}>{i === 3 ? "9.5%" : "15.2%"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 rounded-xl border bg-card p-6">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Flow In/Out</div>
                <div className="text-2xl font-bold">+$250k Net</div>
                <div className="text-xs text-muted-foreground">Last 30 Days</div>
              </div>
              <div className="h-48">
                {/* Mocking multiple lines with Area Chart logic or just using SimpleAreaChart for visual approximation */}
                <SimpleAreaChart color="#22c55e" data={[{ name: 1, value: 20 }, { name: 2, value: 50 }, { name: 3, value: 30 }, { name: 4, value: 80 }, { name: 5, value: 40 }, { name: 6, value: 90 }]} />
              </div>
              <div className="flex items-center gap-4 text-xs mt-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Inflow</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Outflow</div>
              </div>
            </div>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  )
}
