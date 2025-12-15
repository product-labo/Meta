"use client"

import { StartupHeader } from "@/components/startup/startup-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, ArrowDown, Upload, Lightbulb } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const stats = [
  { label: "Daily Active User", value: "6,542", change: "+24%", up: true, vs: "Vs Industry Median: +9%" },
  { label: "User Retention", value: "78.4%", change: "-5%", up: false, vs: "Vs Industry Median: +9%" },
  { label: "Feature Adoption", value: "62%", change: "+12%", up: true, vs: "Vs Industry Median: +9%" },
  { label: "Engagement Rate", value: "4.2m", change: "-0%", up: false, vs: "Vs Industry Median: +9%" },
]

const trendData = [
  { month: "Jan", yourProduct: 3800, topCompetitor: 4000, industryMedian: 3500 },
  { month: "Feb", yourProduct: 4000, topCompetitor: 4200, industryMedian: 3600 },
  { month: "Mar", yourProduct: 4200, topCompetitor: 4500, industryMedian: 3700 },
  { month: "Apr", yourProduct: 4500, topCompetitor: 5000, industryMedian: 3800 },
  { month: "May", yourProduct: 4800, topCompetitor: 5500, industryMedian: 4000 },
  { month: "Jun", yourProduct: 5000, topCompetitor: 6000, industryMedian: 4200 },
]

const competitors = [
  { name: "Competitor A", label: "Daily Active USer", value: "8.2K", change: "+18%", up: true, rank: "#1" },
  { name: "Your Product", label: "Daily Active USer", value: "6.5K", change: "+18%", up: true, rank: "#2" },
  { name: "Competitor B", label: "Daily Active USer", value: "5.9K", change: "+15%", up: true, rank: "#3" },
  { name: "Competitor c", label: "Daily Active USer", value: "4.3K", change: "-3%", up: false, rank: "#4" },
]

const insights = [
  {
    title: "Retention Gap Identified",
    priority: "High",
    priorityColor: "bg-red-100 text-red-600",
    description:
      "Your average user retention grew 15% slower than the industry median this month. Focus on improving onboarding flow and first-week engagement.",
    tag: "User Retention",
    tagColor: "bg-gray-800 text-white",
  },
  {
    title: "Feature Opportunity Detected",
    priority: "High",
    priorityColor: "bg-red-100 text-red-600",
    description:
      "Competitor B's new 'Quick Actions' feature caused a 28% increase in user retention. Similar functionality could close your engagement gap.",
    tag: "Feature Development",
    tagColor: "bg-gray-800 text-white",
  },
  {
    title: "Positive Momentum in Engagement",
    priority: "Medium",
    priorityColor: "bg-yellow-100 text-yellow-700",
    description:
      "Your feature adoption rate increased 12% this quarter, outpacing competitors by 7%. Continue investing in feature discovery.",
    tag: "Engagement",
    tagColor: "bg-gray-800 text-white",
  },
  {
    title: "Market Position Strengthening",
    priority: "Low",
    priorityColor: "bg-green-100 text-green-600",
    description:
      "Your DAU growth of 24% exceeds Competitor C by 27 percentage points. Consider aggressive marketing to capture market share.",
    tag: "Growth Strategy",
    tagColor: "bg-gray-800 text-white",
  },
]

export default function CompetitivePage() {
  return (
    <div className="min-h-screen">
      <StartupHeader
        title="Competitive Benchmarking Insight"
        subtitle="Compare product performance with competitors in the same category."
        action={
          <Button variant="default" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Share/Export
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <span className={`text-sm ${stat.up ? "text-green-600" : "text-red-500"}`}>
                    {stat.up ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.vs}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Trends Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Trends</CardTitle>
            <p className="text-xs text-muted-foreground">
              Compare product performance with competitors in the same category.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 8000]} />
                <Tooltip />
                <Line type="monotone" dataKey="yourProduct" stroke="#22c55e" strokeWidth={2} dot />
                <Line type="monotone" dataKey="topCompetitor" stroke="#ef4444" strokeWidth={2} dot />
                <Line
                  type="monotone"
                  dataKey="industryMedian"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-6 justify-center mt-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" /> Your Product
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" /> Top Competitor
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-yellow-500" style={{ borderStyle: "dashed" }} /> Industry Median
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Competitor Landscape */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Competitor landscape</h2>
          <div className="grid grid-cols-4 gap-4">
            {competitors.map((comp) => (
              <Card key={comp.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{comp.name}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{comp.rank}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{comp.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold">{comp.value}</p>
                    <span className={`text-sm ${comp.up ? "text-green-600" : "text-red-500"}`}>{comp.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Actionable Insights */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Actionable Insights</h2>
          <div className="grid grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{insight.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${insight.priorityColor}`}>
                          {insight.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                      <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${insight.tagColor}`}>
                        {insight.tag}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
