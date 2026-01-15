"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Rocket, Activity, Zap, TrendingUp, Users, Target, BarChart3, Clock, AlertCircle, Wallet, RefreshCw } from "lucide-react"

// Shared Components
import { MetricCard } from "@/components/startup/cards/metric-card"
import { InsightCard } from "@/components/startup/cards/insight-card"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Specialized Components
import { RetentionTable } from "@/components/startup/tables/retention-table"
import { ActivityFunnel } from "@/components/startup/charts/activity-funnel"
import { RetentionCurve } from "@/components/startup/charts/retention-curve"
import { FunnelChart } from "@/components/startup/charts/funnel-chart"
import { TrendChart } from "@/components/startup/charts/trend-chart"
import { CohortCard } from "@/components/startup/cards/cohort-card"
import { RevenueBreakdown } from "@/components/startup/charts/revenue-breakdown"
import { TransactionTrend } from "@/components/startup/charts/transaction-trend"

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState("retention")

  const headerConfig = {
    features: {
      title: "Features Adoption Insight Center",
      subtitle: "Understand early features adoption, engagement correlation, and long-term growth drivers",
      action: (
        <Button className="h-11 px-6 rounded-xl bg-[#111827] text-white hover:bg-gray-800 transition-colors">
          <Share className="w-4 h-4 mr-2" /> Share/Export
        </Button>
      )
    },
    retention: {
      title: "Users Retention & Churn Insight",
      subtitle: "Detect when and why users stop using your product",
      action: (
        <Button className="h-10 px-4 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-gray-800 transition-colors">
          <Clock className="w-4 h-4 mr-2" /> Last 30 Days
        </Button>
      )
    },
    benchmark: {
      title: "Competitive Benchmarking Insight",
      subtitle: "Compare product performance with competitors in the same category.",
      action: (
        <Button className="h-11 px-6 rounded-xl bg-[#111827] text-white hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
          <Share className="w-4 h-4 mr-2" /> Share/Export
        </Button>
      )
    },
    cohorts: {
      title: "Behavioral Cohorts Insight",
      subtitle: "Analyze users pattern and outcomes",
      action: (
        <div className="flex items-center space-x-2">
          <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold">2</div>
          <Button className="h-10 px-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50 p-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      )
    },
    funnel: {
      title: "Growth & Conversion Funnel",
      subtitle: "Visualize where user drop off from acquisition to retention",
      action: (
        <div className="flex items-center space-x-2">
          <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold">2</div>
          <Button className="h-10 px-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50 p-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </Button>
        </div>
      )
    },
    revenue: {
      title: "Transaction & Revenue Insight",
      subtitle: "Understand how features usage translate into revenue",
      action: (
        <div className="flex items-center space-x-2">
          <Button className="h-10 px-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:bg-gray-50 text-xs font-bold text-[#111827]">
            <BarChart3 className="w-4 h-4 mr-2 text-gray-400" /> Customize Insight
          </Button>
        </div>
      )
    }
  }

  const currentHeader = headerConfig[activeTab as keyof typeof headerConfig]

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <DashboardHeader
        title={currentHeader.title}
        subtitle={currentHeader.subtitle}
        action={currentHeader.action}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="bg-transparent h-auto w-full flex justify-start gap-2 p-0 min-w-max">
              {[
                { value: "features", label: "Feature Adoption Insight", icon: Wallet },
                { value: "retention", label: "User Retention", icon: Users },
                { value: "benchmark", label: "Competitive benchmark", icon: Activity },
                { value: "cohorts", label: "Behavioral cohort", icon: RefreshCw },
                { value: "funnel", label: "Growth & Conversion", icon: TrendingUp },
                { value: "revenue", label: "Revenue & Transaction", icon: BarChart3 },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-shrink-0 px-6 bg-transparent data-[state=active]:bg-[#F3F4F6] data-[state=active]:text-[#111827] data-[state=active]:shadow-none text-[#6B7280] rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 border-none ring-0 focus-visible:ring-0"
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.value ? 'text-[#111827]' : 'text-[#6B7280]'}`} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* TAB 1: Feature Adoption Insight (Image 1) */}
        <TabsContent value="features" className="space-y-8 m-0">
          <div className="flex gap-4">
            <Button variant="secondary" className="h-10 bg-white border border-gray-100 rounded-xl px-4 text-xs font-bold shadow-sm text-[#111827]">Last 7 Day</Button>
            <Select defaultValue="30days">
              <SelectTrigger className="w-40 h-10 bg-white border border-gray-100 rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="Last 30 Days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="quarter">
              <SelectTrigger className="w-40 h-10 bg-white border border-gray-100 rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="Last Quarter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 h-10 bg-white border border-gray-100 rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-5">
            {[
              { type: "low", icon: Zap, title: "Core Insight", value: "3X", desc: "Users who use Feature X early are more likely to be retained", tag: "+200% Retention", color: "text-[#10B981]" },
              { type: "low", icon: TrendingUp, title: "High Engagement", value: "4.5X", desc: "Repeat use of Feature X correlates with long-term retention.", tag: "+350% Retention", color: "text-[#10B981]" },
              { type: "medium", icon: Activity, title: "Discoverability Gap", value: "8%", desc: "Feature Y is used by only 8% of new users. Consider improving onboarding.", tag: "Low Adoption", color: "text-[#F59E0B]" },
              { type: "neutral", icon: Clock, title: "Most Adopted Feature", value: "65%", desc: "Feature Z is the most-used feature in the first week.", tag: "High Interaction Rate", color: "text-[#3B82F6]" },
              { type: "high", icon: AlertCircle, title: "Feature Fatigue", value: "-70%", desc: "Usage of Feature Q drops sharply after day 5, low sustained value.", tag: "Usage Drop", color: "text-[#EF4444]" },
              { type: "low", icon: Zap, title: "Feature Synergy", value: "2.8X", desc: "Using Features X & Y together boosts conversion rates.", tag: "+180% Conversion", color: "text-[#10B981]" },
              { type: "medium", icon: Activity, title: "Onboarding Drop-Off", value: "40%", desc: "40% of users abandon onboarding at Feature Z's introduction.", tag: "High Churn Point", color: "text-[#F59E0B]" },
              { type: "neutral", icon: TrendingUp, title: "Top Revenue Feature", value: "52%", desc: "Feature B drives the majority of revenue events despite low engagement.", tag: "of Total Revenue", color: "text-[#3B82F6]" },
              { type: "low", icon: Rocket, title: "Latent Opportunity", value: "+35%", desc: "Feature D adoption is growing rapidly month-over-month.", tag: "MoM Growth", color: "text-[#10B981]" },
              { type: "high", icon: AlertCircle, title: "Negative Impact", value: "1.8X", desc: "Early engagement with Feature E correlates with higher churn.", tag: "More Likely to Churn", color: "text-[#EF4444]" },
              { type: "low", icon: Zap, title: "Hidden Power Feature", value: "5X", desc: "Undiscovered Feature M leads to significantly longer sessions.", tag: "Longer Sessions", color: "text-[#10B981]" },
            ].map((item, i) => (
              <Card key={i} className="border-none shadow-sm rounded-2xl overflow-hidden group">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <item.icon className={`w-3.5 h-3.5 ${item.color}`} /> {item.title}
                  </div>
                  <div className="text-3xl font-bold text-[#111827]">{item.value}</div>
                  <p className="text-xs text-[#6B7280] leading-relaxed font-medium">{item.desc}</p>
                  <div className={`text-[10px] font-bold ${item.color} uppercase`}>{item.tag}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Features</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">%of Users (Week 1)</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Retention Correlation</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Revenue Impact</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Feature X", users: "30%", retention: "+200", revenue: "Moderate", rec: "Promote in Onboarding" },
                  { name: "Feature Y", users: "8%", retention: "Neutral", revenue: "Low", rec: "Promote in Onboarding", alert: true },
                  { name: "Feature Z", users: "65%", retention: "Low", revenue: "Low", rec: "Promote in Onboarding", blue: true },
                  { name: "Feature B", users: "20%", retention: "Moderate", revenue: "High (52%)", rec: "Promote in Onboarding", revBlue: true },
                  { name: "Feature M", users: "12%", retention: "Very High", revenue: "Moderate", rec: "Promote in Onboarding", green: true },
                ].map((item, i) => (
                  <TableRow key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="text-xs font-bold text-[#374151] py-4">{item.name}</TableCell>
                    <TableCell className={`text-xs font-bold py-4 ${item.alert ? "text-[#F59E0B]" : item.blue ? "text-[#3B82F6]" : item.green ? "text-[#10B981]" : "text-[#111827]"}`}>{item.users}</TableCell>
                    <TableCell className={`text-xs font-bold py-4 ${item.retention === "+200" || item.retention === "Very High" ? "text-[#10B981]" : "text-[#6B7280]"}`}>{item.retention}</TableCell>
                    <TableCell className={`text-xs font-bold py-4 ${item.revBlue ? "text-[#3B82F6]" : "text-[#6B7280]"}`}>{item.revenue}</TableCell>
                    <TableCell className="text-xs font-bold text-[#111827] py-4">{item.rec}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: User Retention (Image 0) */}
        <TabsContent value="retention" className="space-y-8 m-0">
          <div className="grid grid-cols-4 gap-6">
            <MetricCard title="Overall Retention Rate" value="42.8%" change="+2.1%" trend="up" />
            <MetricCard title="Churn Rate" value="5.2%" change="-0.5%" trend="down" />
            <MetricCard title="Average Users Lifetime" value="98 days" change="+5 days" trend="up" />
            <MetricCard title="Average Session Duration" value="8m 15s" change="-1m 02s" trend="down" />
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-8">Key Insight</h3>
            <div className="space-y-4">
              <InsightCard
                type="high"
                icon={AlertCircle}
                title="Onboarding Drop-off at Step 3"
                description="Drop-off rate spikes after Step 3 in onboarding — average time to complete Step 3 is 45 seconds longer than peers."
                actionLabel="Explore Data"
              />
              <InsightCard
                type="low"
                icon={TrendingUp}
                title="High Engagement from Push Notifications"
                description="Returning users engage 2.5x longer when push notifications are enabled, correlating with higher feature adoption."
                actionLabel="View Details"
              />
              <InsightCard
                type="medium"
                icon={Users}
                title="High Churn Risk for 'Freemium' Segment"
                description="Users on the Freemium plan who don't use Feature X within 7 days have an 82% churn probability."
                actionLabel="See Segments"
              />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
              <h3 className="text-base font-bold text-[#111827] mb-1">Users Activity Funnel</h3>
              <p className="text-[10px] text-[#6B7280] font-bold mb-8 italic uppercase tracking-wider">Onboarding journey user drop-off point</p>
              <ActivityFunnel />
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
              <h3 className="text-base font-bold text-[#111827] mb-1">Retention Over Time</h3>
              <p className="text-[10px] text-[#6B7280] font-bold mb-8 italic uppercase tracking-wider">User Cohort from the last 5 weeks</p>
              <RetentionTable />
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Competitive Benchmark (Image 2) */}
        <TabsContent value="benchmark" className="space-y-8 m-0">
          <div className="grid grid-cols-4 gap-6">
            <Card className="border-none shadow-sm rounded-2xl bg-white p-6 relative overflow-hidden group">
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Daily Active User</div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-[#111827]">6,542</span>
                <span className="text-xs font-bold text-[#10B981] mb-1">↑ +24%</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-bold mt-2 uppercase tracking-tight">Vs Industry Median: +9%</div>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white p-6 relative overflow-hidden group">
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">User Retention</div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-[#111827]">78.4%</span>
                <span className="text-xs font-bold text-[#EF4444] mb-1">↓ -5%</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-bold mt-2 uppercase tracking-tight">Vs Industry Median: +9%</div>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white p-6 relative overflow-hidden group">
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Feature Adoption</div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-[#111827]">62%</span>
                <span className="text-xs font-bold text-[#10B981] mb-1">↑ +12%</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-bold mt-2 uppercase tracking-tight">Vs Industry Median: +9%</div>
            </Card>
            <Card className="border-none shadow-sm rounded-2xl bg-white p-6 relative overflow-hidden group">
              <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-4">Engagement Rate</div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold text-[#111827]">4.2m</span>
                <span className="text-xs font-bold text-[#6B7280] mb-1">-- 0%</span>
              </div>
              <div className="text-[10px] text-[#6B7280] font-bold mt-2 uppercase tracking-tight">Vs Industry Median: +9%</div>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-1">Performance Trends</h3>
            <p className="text-[10px] text-[#6B7280] font-bold mb-8 italic uppercase tracking-wider">Compare product performance with competitors in the same category.</p>
            <TrendChart />
            <div className="flex items-center justify-center gap-8 mt-10 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Your Product</div>
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Top Competitor</div>
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] border-2 border-dashed border-white ring-1 ring-[#F59E0B]" /> Industry Median</div>
            </div>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl bg-gray-50/50 p-8">
            <h3 className="text-base font-bold text-[#111827] mb-8">Competitor landscape</h3>
            <div className="grid grid-cols-4 gap-6">
              {[
                { name: "Competitor A", users: "8.2K", change: "+18%", tag: "#1", me: false },
                { name: "Your Product", users: "6.5K", change: "+18%", tag: "#2", me: true },
                { name: "Competitor B", users: "5.9K", change: "+15%", tag: "#3", me: false },
                { name: "Competitor C", users: "4.3K", change: "-3%", tag: "#4", me: false },
              ].map((item, i) => (
                <div key={i} className={`p-6 rounded-2xl bg-white shadow-sm border ${item.me ? "border-orange-400" : "border-gray-50"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">{item.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-lg font-bold text-[#111827]">{item.tag}</span>
                  </div>
                  <div className="text-[10px] font-bold text-[#9CA3AF] uppercase mb-1">Daily Active User</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-[#111827]">{item.users}</span>
                    <span className={`text-[10px] font-bold ${item.change.startsWith('+') ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{item.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <h3 className="text-base font-bold text-[#111827]">Actionable Insights</h3>
            <div className="grid grid-cols-2 gap-6">
              <InsightCard
                type="high"
                icon={Target} tag="High"
                title="Retention Gap Identified"
                description="Your average user retention grew 15% slower than the industry median this month. Focus on improving onboarding flow and first-week engagement."
                actionLabel="User Retention"
              />
              <InsightCard
                type="high"
                icon={Target} tag="High"
                title="Feature Opportunity Detected"
                description="Competitor B's new 'Quick Actions' feature caused a 28% increase in user retention. Similar functionality could close your engagement gap."
                actionLabel="Feature Development"
              />
              <InsightCard
                type="medium"
                icon={Target} tag="Medium"
                title="Positive Momentum in Engagement"
                description="Your feature adoption rate increased 12% this quarter, outpacing competitors by 7%. Continue investing in feature discovery."
                actionLabel="Engagement"
              />
              <InsightCard
                type="low"
                icon={Target} tag="Low"
                title="Market Position Strengthening"
                description="Your DAU growth of 24% exceeds Competitor C by 27 percentage points. Consider aggressive marketing to capture market share."
                actionLabel="Growth Strategy"
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Behavioral Cohort (Image 4) */}
        <TabsContent value="cohorts" className="space-y-8 m-0">
          <div className="grid grid-cols-4 gap-6">
            <MetricCard title="Total Users" value="39,894" change="12.5%" trend="up" />
            <MetricCard title="Avg Retention" value="62.8%" change="4.5%" trend="up" />
            <MetricCard title="Revenue/Users" value="$127.40" change="2.1%" trend="up" />
            <MetricCard title="Active Cohorts" value="4" change="0%" trend="neutral" />
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8 grid grid-cols-2 gap-6">
              <CohortCard
                title="Cohort A" subtitle="Referral Users" riskLevel="Low Risk"
                users="12,847" retention="78%" revenue="$1.4" platform="Cross-platform"
                dotColor="#22c55e"
              />
              <CohortCard
                title="Cohort B" subtitle="iOS Organic" riskLevel="Low Risk"
                users="8,234" retention="32%" revenue="$0.7" platform="iOS"
                dotColor="#ef4444"
              />
              <CohortCard
                title="Cohort C" subtitle="Paid Acquisition" riskLevel="Medium Risk"
                users="15,392" retention="52%" revenue="$1.1" platform="Android"
                dotColor="#eab308"
              />
              <CohortCard
                title="Cohort D" subtitle="Enterprise Users" riskLevel="Low Risk"
                users="3,421" retention="89%" revenue="$2.8" platform="Web"
                dotColor="#22c55e"
              />
            </div>
            <div className="col-span-4 space-y-4">
              <InsightCard type="medium" title="Referral user outcome" description="Competitor B's new 'Quick Actions' feature caused a Similar functionality could close your engagement gap." tag="+140 Revenue" />
              <InsightCard type="high" title="iOS churn detected" description="Cohort B churns 70% faster—mostly users from iOS devices. Consider UX audit." tag="-70% Retention" />
              <InsightCard type="low" title="Enterprise excellence" description="Enterprise users (Cohort D) show exceptional engagement with 89% retention rate." tag="+180% LTV" />
              <InsightCard type="neutral" title="Paid acquisition stable" description="Google Ads cohort shows median performance. ROI positive but room for optimization." tag="51% ROAS" />
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-1">Retention Curve</h3>
            <p className="text-[10px] text-[#6B7280] font-bold mb-8 italic uppercase tracking-wider">12 Month cohort retention companion</p>
            <RetentionCurve />
            <div className="flex items-center justify-center gap-8 mt-10 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Cohort A</div>
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Cohort B</div>
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Cohort C</div>
              <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Cohort D</div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: Growth & Conversion (Image 3) */}
        <TabsContent value="funnel" className="space-y-8 m-0">
          <div className="flex gap-4">
            <Select defaultValue="30days">
              <SelectTrigger className="w-48 h-10 bg-gray-50 border-none rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="Date: Last 30 Days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="30days">Date: Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-48 h-10 bg-gray-50 border-none rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="Segment: All Users" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Segment: All Users</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-40 h-10 bg-gray-50 border-none rounded-xl text-xs font-bold shadow-sm px-4">
                <SelectValue placeholder="Channel: All" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Channel: All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <Card className="border-none shadow-sm rounded-2xl bg-gray-50/50 p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-base font-bold text-[#111827]">Conversion Funnel</h3>
                  <Select defaultValue="30days">
                    <SelectTrigger className="w-32 h-8 bg-transparent border-none text-[10px] font-bold text-[#6B7280]">
                      <SelectValue placeholder="Last 30 Days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">Last 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FunnelChart />
              </Card>
            </div>
            <div className="col-span-4 space-y-6">
              <MetricCard
                title="Signups to Activation Box"
                value="35%" change="-1.2%" trend="down"
                subtext="Only 35% of signups activate. Improving onboarding is a key opportunity."
              />
              <MetricCard
                title="Activated to Paying"
                value="60%" change="+5.0%" trend="up"
                subtext="60% of activated users become paying customers within 14 days."
              />
              <MetricCard
                title="Potential MRR Increase"
                value="4%" change="+0.5%" trend="up"
                subtext="A 10% onboarding improvement could yield a 4% increase in total MRR."
              />
            </div>
          </div>

          <Card className="border-none shadow-sm rounded-2xl bg-white p-8">
            <h3 className="text-base font-bold text-[#111827] mb-8">Top Countries & Drop-off Rate</h3>
            <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Stage</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">User Count</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Conversion Rate</TableHead>
                    <TableHead className="text-[10px] font-bold text-[#6B7280] uppercase py-4">Drop-off Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { stage: "Signups", count: "12,500", conv: "-", drop: "-" },
                    { stage: "Activation", count: "4,357", conv: "35.00%", drop: "65.00%", dropRed: true },
                    { stage: "First-Week Retention", count: "3,112", conv: "71.42%", drop: "28.58%", dropRed: true },
                    { stage: "Monetization", count: "2,162", conv: "84.00%", drop: "16.00%", dropRed: true },
                  ].map((item, i) => (
                    <TableRow key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="text-xs font-bold text-[#374151] py-5">{item.stage}</TableCell>
                      <TableCell className="text-xs font-bold text-[#111827] py-5">{item.count}</TableCell>
                      <TableCell className="text-xs font-bold text-[#111827] py-5">{item.conv}</TableCell>
                      <TableCell className={`text-xs font-bold py-5 ${item.dropRed ? "text-red-500" : "text-[#111827]"}`}>{item.drop}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: Revenue & Transaction (New Design) */}
        <TabsContent value="revenue" className="space-y-8 m-0">
          <div className="grid grid-cols-4 gap-6">
            <MetricCard title="Total Revenue" value="$127,430" change="+1.5%" trend="up" />
            <MetricCard title="Transaction" value="8,432" change="+8.2%" trend="up" />
            <MetricCard title="AVG. Transaction" value="$15.21" change="-2.4%" trend="down" />
            <MetricCard title="Total Users" value="3,214" change="+18.7%" trend="up" />
          </div>

          <div className="grid grid-cols-5 gap-6">
            <Card className="col-span-3 border-none shadow-sm rounded-2xl bg-white p-8">
              <div className="space-y-1 mb-8">
                <h3 className="text-base font-bold text-[#111827]">Feature Revenue Breakdown</h3>
                <p className="text-[10px] text-[#6B7280] font-bold italic uppercase tracking-wider">Revenue Contribution by product feature</p>
              </div>
              <RevenueBreakdown />
              <div className="flex items-center justify-center gap-6 mt-8 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { label: "45%", color: "bg-[#00A3FF]" },
                  { label: "28%", color: "bg-[#10B981]" },
                  { label: "15%", color: "bg-[#111827]" },
                  { label: "8%", color: "bg-[#F59E0B]" },
                  { label: "4%", color: "bg-[#EF4444]" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-[10px] font-bold text-[#6B7280]">{item.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="col-span-2 border-none shadow-sm rounded-2xl bg-white p-8">
              <div className="space-y-1 mb-8">
                <h3 className="text-base font-bold text-[#111827]">Transaction Trend</h3>
                <p className="text-[10px] text-[#6B7280] font-bold italic uppercase tracking-wider">Monthly transaction volume and revenue over time</p>
              </div>
              <TransactionTrend />
              <div className="flex items-center justify-center gap-8 mt-10 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Transaction</div>
                <div className="flex items-center gap-2 text-[#4B5563]"><div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" /> Revenue</div>
              </div>
            </Card>
          </div>

          <div className="bg-[#F9FAFB]/50 rounded-2xl p-8 space-y-6">
            <h3 className="text-base font-bold text-[#111827]">Business Insights</h3>
            <p className="text-[10px] text-[#6B7280] font-bold -mt-4 italic uppercase tracking-wider">12 Month cohort retention companion</p>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#15803D] uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4" /> High Gas Fee
                  </div>
                  <span className="text-sm font-bold text-[#15803D]">52%</span>
                </div>
                <p className="text-xs text-[#15803D]/80 font-medium leading-relaxed">
                  Users interacting with Feature A generate 45% of total revenue. Consider expanding its capabilities.
                </p>
              </div>

              <div className="p-6 bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4" /> Low Conversion: Feature B
                  </div>
                  <span className="text-sm font-bold text-[#B45309]">28%</span>
                </div>
                <p className="text-xs text-[#B45309]/80 font-medium leading-relaxed">
                  Feature B correlates with lower conversion rates. Consider repositioning or adding upselling opportunities.
                </p>
              </div>

              <div className="col-span-1 p-6 bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wider">
                  <Zap className="w-4 h-4" /> Growth Opportunity
                </div>
                <p className="text-xs text-[#1D4ED8]/80 font-medium leading-relaxed">
                  Transaction volume increased 18% among users who engaged with Feature C within their first week.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
