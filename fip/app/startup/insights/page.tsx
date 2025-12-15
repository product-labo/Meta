"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Share, Upload } from "lucide-react"

// Tab 1: Behavioral Cohorts
import { MetricCard } from "@/components/startup/cards/metric-card"
import { CohortCard } from "@/components/startup/cards/cohort-card"

// Tab 2: Growth Funnel
import { FunnelChart } from "@/components/startup/charts/funnel-chart"
import { FunnelTable } from "@/components/startup/tables/funnel-table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Tab 3: Feature Adoption
import { InsightCard } from "@/components/startup/cards/insight-card"
import { Lightbulb, Rocket, Activity, Zap, MousePointerClick, AlertTriangle, EyeOff, TrendingUp } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function InsightsPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Header handled by specific tab content usually, but here we can have a shared one or per-tab */}

      <Tabs defaultValue="cohorts" className="w-full space-y-8">
        <div className="flex items-center justify-between">
          {/* Tabs List acting as sub-navigation */}
          <TabsList className="bg-transparent p-0 gap-6 h-auto">
            <TabsTrigger
              value="cohorts"
              className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2"
            >
              Behavioral Cohorts
            </TabsTrigger>
            <TabsTrigger
              value="funnel"
              className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2"
            >
              Growth & Conversion
            </TabsTrigger>
            <TabsTrigger
              value="features"
              className="bg-transparent p-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground rounded-none pb-2"
            >
              Feature Adoption
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Behavioral Cohorts */}
        <TabsContent value="cohorts" className="space-y-8 m-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Behavioral Cohorts Insight</h1>
              <p className="text-muted-foreground">Analyze users pattern and outcomes</p>
            </div>
            <Button className="bg-slate-900 text-white">
              <Share className="w-4 h-4 mr-2" /> Share/Export
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <MetricCard title="Total Users" value="39,894" change="12.5%" trend="up" />
            <MetricCard title="Avg Retention" value="62.8%" change="4.5%" trend="up" />
            <MetricCard title="Revenue/Users" value="$127.40" change="2.1%" trend="up" />
            <MetricCard title="Active Cohorts" value="4" change="0%" trend="neutral" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Row 1 */}
            <CohortCard
              title="Cohort A" subtitle="Referral Users" riskLevel="Low Risk"
              users="12,847" retention="78%" revenue="$1.4" platform="Cross-platform"
              dotColor="#22c55e"
            />
            <CohortCard
              title="Cohort B" subtitle="iOS Organic" riskLevel="Low Risk"
              users="8,234" retention="32%" revenue="$0.7" platform="iOS"
              // Note: Design has red icon but says "Low Risk", trusting design visual which has red dot.
              dotColor="#ef4444"
            />

            {/* Specific Insight Card for Referral */}
            <div className="col-span-2">
              <InsightCard
                type="low"
                icon={TrendingUp}
                title="Referral user outcome"
                description="Competitor B's new 'Quick Actions' feature caused a Similar functionality could close your engagement gap."
                tag="+140 Revenue"
              />
            </div>

            {/* Row 2 */}
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
        </TabsContent>

        {/* TAB 2: Growth & Conversion Funnel */}
        <TabsContent value="funnel" className="space-y-8 m-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Growth & Conversion Funnel</h1>
              <p className="text-muted-foreground">Visualize where user drop off from acquisition to retention</p>
            </div>
            <Button className="bg-slate-900 text-white">
              <Share className="w-4 h-4 mr-2" /> Share/Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Select defaultValue="30days"><SelectTrigger className="w-[180px] bg-muted/20"><SelectValue placeholder="Date" /></SelectTrigger><SelectContent><SelectItem value="30days">Date: Last 30 Days</SelectItem></SelectContent></Select>
            <Select defaultValue="all"><SelectTrigger className="w-[180px] bg-muted/20"><SelectValue placeholder="Segment" /></SelectTrigger><SelectContent><SelectItem value="all">Segment: All Users</SelectItem></SelectContent></Select>
            <Select defaultValue="all"><SelectTrigger className="w-[180px] bg-muted/20"><SelectValue placeholder="Channel" /></SelectTrigger><SelectContent><SelectItem value="all">Channel: All</SelectItem></SelectContent></Select>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {/* Main Funnel Chart */}
            <div className="col-span-2 bg-muted/10 p-8 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-lg">Conversion Funnel</h3>
                <span className="text-sm text-muted-foreground">Last 30 Days</span>
              </div>
              <FunnelChart />
            </div>

            {/* Right Side Cards */}
            <div className="space-y-6">
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

          {/* Table */}
          <FunnelTable />
        </TabsContent>


        {/* TAB 3: Feature Adoption */}
        <TabsContent value="features" className="space-y-8 m-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Features Adoption Insight Center</h1>
              <p className="text-muted-foreground">Understand early features adoption, engagement correlation, and long-term growth drivers</p>
            </div>
            <Button className="bg-slate-900 text-white">
              <Share className="w-4 h-4 mr-2" /> Share/Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Button variant="secondary" className="bg-muted/30">Last 7 Day</Button>
            <Select defaultValue="30days"><SelectTrigger className="w-[140px] bg-muted/20 border-none"><SelectValue placeholder="30 Days" /></SelectTrigger><SelectContent><SelectItem value="30days">Last 30 Days</SelectItem></SelectContent></Select>
            <Select defaultValue="quarter"><SelectTrigger className="w-[140px] bg-muted/20 border-none"><SelectValue placeholder="Quarter" /></SelectTrigger><SelectContent><SelectItem value="quarter">Last Quarter</SelectItem></SelectContent></Select>
            <Select defaultValue="all"><SelectTrigger className="w-[140px] bg-muted/20 border-none"><SelectValue placeholder="All Time" /></SelectTrigger><SelectContent><SelectItem value="all">All Time</SelectItem></SelectContent></Select>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Core Insight</div>
              <div className="text-3xl font-bold">3X</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Users who use Feature X early are more likely to be retained</p>
              <div className="pt-2 text-sm font-medium text-green-500">+200% Retention</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> High Engagement</div>
              <div className="text-3xl font-bold">4.5X</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Repeat use of Feature X correlates with long-term retention.</p>
              <div className="pt-2 text-sm font-medium text-green-500">+350% Retention</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Discoverability Gap</div>
              <div className="text-3xl font-bold">8%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Feature Y is used by only 8% of new users. Consider improving onboarding.</p>
              <div className="pt-2 text-sm font-medium text-orange-500">Low Adoption</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Most Adopted Feature</div>
              <div className="text-3xl font-bold">65%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Feature Z is the most-used feature in the first week.</p>
              <div className="pt-2 text-sm font-medium text-blue-500">High Interaction Rate</div>
            </div>

            {/* Row 2 */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Feature Fatigue</div>
              <div className="text-3xl font-bold">-70%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Usage of Feature Q drops sharply after day 5, low sustained value.</p>
              <div className="pt-2 text-sm font-medium text-red-500">Usage Drop</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Feature Synergy</div>
              <div className="text-3xl font-bold">2.8X</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Using Features X & Y together boosts conversion rates.</p>
              <div className="pt-2 text-sm font-medium text-green-500">+180% Conversion</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Onboarding Drop-Off</div>
              <div className="text-3xl font-bold">40%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">40% of users abandon onboarding at Feature Z's introduction.</p>
              <div className="pt-2 text-sm font-medium text-orange-500">High Churn Point</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Top Revenue Feature</div>
              <div className="text-3xl font-bold">52%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Feature B drives the majority of revenue events despite low engagement.</p>
              <div className="pt-2 text-sm font-medium text-blue-500">of Total Revenue</div>
            </div>

            {/* Row 3 */}
            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Latent Opportunity</div>
              <div className="text-3xl font-bold">+35%</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Feature D adoption is growing rapidly month-over-month.</p>
              <div className="pt-2 text-sm font-medium text-green-500">MoM Growth</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Negative Impact</div>
              <div className="text-3xl font-bold">1.8X</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Early engagement with Feature E correlates with higher churn.</p>
              <div className="pt-2 text-sm font-medium text-red-500">More Likely to Churn</div>
            </div>

            <div className="space-y-3 p-4 border rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium"><Rocket className="w-4 h-4 text-green-500" /> Hidden Power Feature</div>
              <div className="text-3xl font-bold">5X</div>
              <p className="text-xs text-muted-foreground leading-relaxed">Undiscovered Feature M leads to significantly longer sessions.</p>
              <div className="pt-2 text-sm font-medium text-green-500">Longer Sessions</div>
            </div>
          </div>

          {/* Feature Adoption Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase">Features</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase">%of Users (Week 1)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase">Retention Correlation</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase">Revenue Impact</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground uppercase">Recommendation</TableHead>
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
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium text-muted-foreground">{item.name}</TableCell>
                    <TableCell className={`text-sm ${item.alert ? "text-orange-500" : item.blue ? "text-blue-500" : item.green ? "text-yellow-500" : ""}`}>{item.users}</TableCell>
                    <TableCell className={`text-sm ${item.retention === "+200" || item.retention === "Very High" ? "text-green-500" : "text-muted-foreground"}`}>{item.retention}</TableCell>
                    <TableCell className={`text-sm ${item.revBlue ? "text-blue-500" : "text-muted-foreground"}`}>{item.revenue}</TableCell>
                    <TableCell className="text-sm text-foreground">{item.rec}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
