"use client"

import { Card, CardContent } from "@/components/ui/card"
import { DonutChart } from "@/components/startup/charts/donut-chart"
import { InsightCard } from "@/components/startup/cards/insight-card"
import { Bell, Shield, Zap, CheckCircle2, AlertTriangle, PlayCircle, ToggleRight } from "lucide-react"

export default function ProductivityPage() {
  return (
    <div className="p-8 space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productivity Score</h1>
          <p className="text-muted-foreground">Compare key Metrics for your features against competitors to gain actionable insight</p>
        </div>
        <div className="px-4 py-2 bg-green-100 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
          <span className="font-bold">Summary insight</span>
          Alert are taking long to respond to. Your response rate dropped to 62% - unresolved alert are staring to strak
          <span className="underline cursor-pointer">Improving your alert response could raise your score by +12 point</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-8">
        {/* Left Col: Scorce and Trend */}
        <div className="col-span-1 space-y-6">
          <Card><CardContent className="p-8 flex flex-col items-center justify-center text-center h-[300px]">
            <div className="text-sm text-muted-foreground mb-4">Operational Productivity Score</div>
            <DonutChart
              data={[{ value: 68, color: "#f59e0b" }, { value: 32, color: "#e5e7eb" }]} // Orange
              centerLabel="68"
              centerSub="MODERATE"
              innerRadius={70}
              outerRadius={85}
            />
            <div className="mt-4 text-xs">
              <span className="text-orange-500 font-bold">Moderate Health</span> - Room for Improvement
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <div className="flex justify-between text-xs mb-2">
              <span>7-Day Trend</span>
              <span className="text-green-500">+6%</span>
            </div>
            {/* Simple steps visualization */}
            <div className="flex items-end h-20 gap-1 mt-2">
              {[20, 25, 30, 45, 50, 65, 70].map((h, i) => (
                <div key={i} className="w-full bg-green-500 rounded-t opacity-80" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </CardContent></Card>
        </div>

        {/* Right Col: Pillar breakdown and Insights */}
        <div className="col-span-3 space-y-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Pillar Breakdown</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "Feature Stability", val: 72, color: "bg-orange-400", sub: "25%", icon: Shield },
                { name: "Response to alert", val: 49, color: "bg-red-400", sub: "25%", icon: Zap },
                { name: "Resolution Efficiency", val: 61, color: "bg-orange-400", sub: "20%", icon: CheckCircle2 },
                { name: "Task Completion", val: 54, color: "bg-orange-400", sub: "15%", icon: PlayCircle },
                { name: "operation Hygiene", val: 84, color: "bg-green-500", sub: "15%", icon: Zap },
              ].map((item, i) => (
                <div key={i} className="bg-card p-4 rounded-lg border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded bg-muted/20 text-muted-foreground`}><item.icon className="w-4 h-4" /></div>
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground">{item.sub}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end w-32">
                    <span className={`text-lg font-bold ${item.val < 50 ? "text-red-500" : item.val < 75 ? "text-orange-500" : "text-green-500"}`}>{item.val}</span>
                    <div className="w-full h-1.5 bg-muted/30 rounded-full mt-1">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Latest Insight</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-red-200 bg-red-50/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2"><div className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Operation Hygiene</div></div>
                <p className="text-xs text-muted-foreground">5 critical alert was ignored for more than 24 months</p>
              </div>
              <div className="p-4 border border-orange-200 bg-orange-50/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2"><div className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Feature Stability</div></div>
                <p className="text-xs text-muted-foreground">Features X experience a 24% failure rate this week impacting 38% of users</p>
              </div>
              <div className="p-4 border border-green-200 bg-green-50/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2"><div className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">Resolution</div></div>
                <p className="text-xs text-muted-foreground">Features X experience a 24% failure rate this week impacting 38% of users</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Auto-Generate Task</h3>
              <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded">5 Pending</div>
            </div>
            <div className="space-y-2">
              {[
                { name: "Investigate high failure rate for feature X", prior: "High", color: "bg-red-100 text-red-600" },
                { name: "Respond to outstanding alerts with SLA", prior: "High", color: "bg-red-100 text-red-600" },
                { name: "Improve test coverage for onboarding flow", prior: "Medium", color: "bg-orange-100 text-orange-600" },
                { name: "Review logging scheme for missing events", prior: "Medium", color: "bg-orange-100 text-orange-600" },
                { name: "Close overdue task related to feature discoverability", prior: "Low", color: "bg-gray-100 text-gray-600" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-muted rounded-full" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${item.color}`}>{item.prior}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
