"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle2, Zap, Shield, PlayCircle, ToggleRight, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DonutChart } from "@/components/startup/charts/donut-chart"
import { SimpleAreaChart } from "@/components/startup/charts/area-chart"

export default function ProductivityPage() {
  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <DashboardHeader
        title="Productivity Score"
        subtitle="Compare key Metrics for your features against competitors to gain actionable insight"
      />

      {/* Summary Insight Box */}
      <div className="bg-[#DCFCE7]/30 border border-[#BBF7D0] p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-[#111827]">Summary insight</span>
        </div>
        <p className="text-sm text-[#374151] leading-relaxed">
          Alert are taking long to respond to. Your response rate dropped to 62% - unresolved alert are staring to strak
        </p>
        <p className="text-sm text-[#059669] font-semibold mt-2 cursor-pointer hover:underline inline-block">
          Improving your alert response could raise your score by +12 point
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Score and Trend (4/12) */}
        <div className="col-span-4 space-y-8">
          {/* Operational Productivity Score Card */}
          <Card className="border-none shadow-sm rounded-2xl bg-white p-8 overflow-hidden h-fit">
            <div className="text-center space-y-6">
              <h3 className="text-sm font-medium text-[#6B7280]">Operational Productivity Score</h3>
              <div className="relative flex items-center justify-center">
                <DonutChart
                  data={[{ value: 68, color: "#F59E0B" }, { value: 32, color: "#F3F4F6" }]}
                  centerLabel="68"
                  centerSub="/ 100"
                  innerRadius={80}
                  outerRadius={100}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                  <div className="text-[#F59E0B] font-bold text-sm tracking-widest uppercase">Moderate</div>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-[#F59E0B]">Moderate Health <span className="text-[#6B7280] font-normal">- Room for Improvement</span></p>
              </div>
            </div>
          </Card>

          {/* 7-Day Trend Card */}
          <Card className="border-none shadow-sm rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-[#111827]">7-Day Trend</h3>
              <div className="flex items-center gap-1 text-[#10B981] text-xs font-bold">
                <TrendingUp className="w-3 h-3" /> +6%
              </div>
            </div>
            <div className="h-48 w-full">
              <SimpleAreaChart
                data={[
                  { name: 'Mon', value: 30 },
                  { name: 'Tue', value: 28 },
                  { name: 'Wed', value: 45 },
                  { name: 'Thu', value: 42 },
                  { name: 'Fri', value: 65 },
                  { name: 'Sat', value: 75 },
                  { name: 'Sun', value: 85 }
                ]}
                color="#10B981"
                showAxes={true}
                showGrid={true}
              />
            </div>
          </Card>
        </div>

        {/* Right Column: Breakdown, Insights, Tasks (8/12) */}
        <div className="col-span-8 space-y-10">

          {/* Pillar Breakdown */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-[#111827]">Pillar Breakdown</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { name: "Feature Stability", val: 72, icon: Shield, color: "#F59E0B", bg: "#FEF3C7", sub: "25%" },
                { name: "Response to alert", val: 49, icon: Zap, color: "#EF4444", bg: "#FEE2E2", sub: "25%" },
                { name: "Resolution Efficiency", val: 61, icon: CheckCircle2, color: "#F59E0B", bg: "#FEF3C7", sub: "20%" },
                { name: "Task Completion", val: 54, icon: PlayCircle, color: "#F59E0B", bg: "#FEF3C7", sub: "15%" },
                { name: "operation Hygiene", val: 84, icon: ToggleRight, color: "#10B981", bg: "#DCFCE7", sub: "15%" },
              ].map((item, i) => (
                <Card key={i} className="border-none shadow-sm shadow-gray-200/50 rounded-2xl p-5 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg, color: item.color }}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#111827]">{item.name}</div>
                        <div className="text-[10px] text-[#9CA3AF] font-medium">{item.sub}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold" style={{ color: item.color }}>{item.val}</div>
                  </div>
                  <div className="w-full h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.val}%`, backgroundColor: item.color }} />
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Latest Insight */}
          <section className="space-y-6">
            <h3 className="text-lg font-bold text-[#111827]">Latest Insight</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { title: "OPERATION HYGIENE", text: "5 critical alert was ignored for more than 24 months", color: "#EF4444", bg: "#FEF3C7", border: "#EF4444", icon: AlertTriangle },
                { title: "FEATURE STABILITY", text: "Features X experience a 24% failure rate this week impacting 38% of users", color: "#F59E0B", bg: "#FEF3C7", border: "#F59E0B", icon: AlertTriangle },
                { title: "RESOLUTION", text: "Features X experience a 24% failure rate this week impacting 38% of users", color: "#10B981", bg: "#DCFCE7", border: "#10B981", icon: CheckCircle2 },
                { title: "TASK DISCIPLINE", text: "Only 33% of high-priority task were completed this circle", color: "#F59E0B", bg: "#FEF3C7", border: "#FDE68A", icon: AlertTriangle },
                { title: "RESOLUTION", text: "Features Y is the most stable features this month with 99.4% uptime", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE", icon: ShieldCheck },
              ].map((item, i) => (
                <div key={i} className={`p-5 rounded-2xl border bg-white space-y-3 shadow-sm transition-all hover:shadow-md h-full`} style={{ borderColor: item.border, backgroundColor: item.bg + '10' }}>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-white shadow-xs" style={{ color: item.color }}><item.icon className="w-3 h-3" /></div>
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: item.color }}>{item.title}</span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Auto-Generate Task */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111827]">Auto-Generate Task</h3>
              <div className="bg-[#111827] text-white text-[10px] font-bold px-3 py-1 rounded-full">5 Pending</div>
            </div>
            <div className="space-y-3">
              {[
                { name: "Investigate high failure rate for feature X", prior: "High", color: "bg-[#FEE2E2] text-[#EF4444]" },
                { name: "Respond to outstanding alerts with SLA", prior: "High", color: "bg-[#FEE2E2] text-[#EF4444]" },
                { name: "Improve test coverage for onboarding flow", prior: "Medium", color: "bg-[#FEF3C7] text-[#D97706]" },
                { name: "Review logging scheme for missing events", prior: "Medium", color: "bg-[#FEF3C7] text-[#D97706]" },
                { name: "Close overdue task related to feature discoverability", prior: "Low", color: "bg-[#F3F4F6] text-[#6B7280]" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 border-2 border-gray-200 rounded-full group-hover:border-[#10B981] transition-colors flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white group-hover:text-[#10B981] opacity-0 group-hover:opacity-100" />
                    </div>
                    <span className="text-sm font-medium text-[#374151]">{item.name}</span>
                  </div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-tight ${item.color}`}>{item.prior}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
