"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Bell, Settings } from "lucide-react"

// Tab 1: Comparison
import { BenchmarkTable } from "@/components/startup/tables/benchmark-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InsightCard } from "@/components/startup/cards/insight-card"
import { Fuel, UserMinus, TrendingUp } from "lucide-react"

// Tab 2: Trends
import { TrendChart } from "@/components/startup/charts/trend-chart"
import { Card, CardContent } from "@/components/ui/card"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function BenchmarkPage() {
  return (
    <div className="p-8 space-y-8">

      <Tabs defaultValue="table" className="w-full space-y-8">
        <div className="flex items-center justify-between">
          {/* Tabs List acting as sub-navigation */}
          {/* Since the designs are separate "Competitive Benchmark" and "Competitive Benchmarking Insight", 
               I am assuming they are tabs or related views. The Table one looks like the main view. 
           */}
        </div>

        {/* Since the design shows "Competitive Benchmark" title for both but slightly different subtitles, 
            I will use a single page title and switch content 
        */}

        <TabsContent value="table" className="space-y-8 m-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Competitive Benchmark</h1>
              <p className="text-muted-foreground">Compare key Metrics for your features against competitors to gain actionable insight</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Toggle for views if I want to make them flip, but Tab is better. Let's add a button to switch Views manually if Tabs list is hidden */}
              <TabsList>
                <TabsTrigger value="table">Benchmark Table</TabsTrigger>
                <TabsTrigger value="trends">Performance Insight</TabsTrigger>
              </TabsList>

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

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Project A (Baseline)</label>
            <Select defaultValue="tokens"><SelectTrigger className="w-[300px] bg-background"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="tokens">swapExactTokensForETH</SelectItem></SelectContent></Select>
          </div>

          <BenchmarkTable />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Actionable insight</h3>
            <div className="grid grid-cols-3 gap-6">
              <InsightCard
                type="high"
                icon={Fuel}
                title="High Gas Cost"
                description="Your Gas fees cost 3x higher than the average competitor. consider optimizing contract efficiency."
              />
              <InsightCard
                type="medium"
                icon={UserMinus}
                title="Low Retention"
                description="Feature retention is low on swap. investigate user friction point or consider L2 onboarding"
              />
              <InsightCard
                type="low"
                icon={TrendingUp}
                title="Outperforming"
                description="NFT Minting features is outperforming v2 8/10 competitor in user adoption. Double down on this strenght"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-8 m-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Competitive Benchmarking Insight</h1>
              <p className="text-muted-foreground">Compare product performance with competitors in the same category.</p>
            </div>
            <div className="flex items-center gap-4">
              <TabsList>
                <TabsTrigger value="table">Benchmark Table</TabsTrigger>
                <TabsTrigger value="trends">Performance Insight</TabsTrigger>
              </TabsList>
              <Button className="bg-slate-900 text-white">
                <Share className="w-4 h-4 mr-2" /> Share/Export
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <Card><CardContent className="p-6">
              <div className="text-xs text-muted-foreground mb-1">Daily Active User</div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">6,542</span>
                <span className="text-xs text-green-500 font-medium mb-1">↑ +24%</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Vs Industry Median: +9%</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-xs text-muted-foreground mb-1">User Retention</div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">78.4%</span>
                <span className="text-xs text-red-500 font-medium mb-1">↓ -5%</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Vs Industry Median: +9%</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-xs text-muted-foreground mb-1">Feature Adoption</div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">62%</span>
                <span className="text-xs text-green-500 font-medium mb-1">↑ +12%</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Vs Industry Median: +9%</div>
            </CardContent></Card>
            <Card><CardContent className="p-6">
              <div className="text-xs text-muted-foreground mb-1">Engagement Rate</div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">4.2m</span>
                <span className="text-xs text-muted-foreground font-medium mb-1">-- 0%</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Vs Industry Median: +9%</div>
            </CardContent></Card>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Performance Trends</h3>
            <p className="text-sm text-muted-foreground">Compare product performance with competitors in the same category.</p>

            <div className="rounded-xl border bg-card p-6">
              <TrendChart />
              <div className="flex items-center justify-center gap-6 mt-4 text-xs font-medium">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> Your Product</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Top Competitor</div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Industry Median</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Competitor landscape</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { name: "Competitor A", users: "8.2K", change: "+18%", tag: "#1", isMe: false },
                { name: "Your Product", users: "6.5K", change: "+18%", tag: "#2", isMe: true },
                { name: "Competitor B", users: "5.9K", change: "+15%", tag: "#3", isMe: false },
                { name: "Competitor C", users: "4.3K", change: "-3%", tag: "#4", isMe: false, down: true },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-lg bg-card border ${item.isMe ? "ring-1 ring-yellow-400" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">{item.tag}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-1">Daily Active User</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">{item.users}</span>
                    <span className={`text-xs font-medium ${item.down ? "text-red-500" : "text-green-500"}`}>{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Actionable Insights</h3>
            <div className="grid grid-cols-2 gap-4">
              <InsightCard
                type="high"
                icon={Fuel} tag="High"
                title="Retention Gap Identified"
                description="Your average user retention grew 15% slower than the industry median this month. Focus on improving onboarding flow and first-week engagement."
                actionLabel="User Interface"
              />
              <InsightCard
                type="high"
                icon={Fuel} tag="High"
                title="Feature Opportunity Detected"
                description="Competitor B's new 'Quick Actions' feature caused a 28% increase in user retention. Similar functionality could close your engagement gap."
                actionLabel="Feature Development"
              />
              <InsightCard
                type="medium" tag="Medium"
                title="Positive Momentum in Engagement"
                description="Your feature adoption rate increased 12% this quarter, outpacing competitors by 7%. Continue investing in feature discovery."
                actionLabel="Engagement"
              />
              <InsightCard
                type="low" tag="Low"
                title="Market Position Strengthening"
                description="Your DAU growth of 24% exceeds Competitor C by 27 percentage points. Consider aggressive marketing to capture market share."
                actionLabel="Growth Strategy"
              />
            </div>
          </div>

        </TabsContent>
      </Tabs>
    </div>
  )
}
