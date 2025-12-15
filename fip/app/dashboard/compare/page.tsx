"use client"

import type React from "react"

import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Trophy, TrendingUp, AlertTriangle, Lightbulb, Settings } from "lucide-react"

const executiveSummary = [
  { icon: Trophy, label: "Project Alpha in", value: "Retention & Growth", color: "bg-green-50 text-green-600" },
  {
    icon: AlertTriangle,
    label: "Project Alpha in",
    value: "Revenue per features",
    color: "bg-orange-50 text-orange-600",
  },
  { icon: Lightbulb, label: "Key Insight", value: "Focus on Monetization", color: "bg-teal-50 text-teal-600" },
]

const featureUsage = [
  {
    metric: "Calls Per Feature",
    alpha: "2,847",
    beta: "1,923",
    winner: "alpha",
    recommendation: "Beta needs features promotions strategy",
  },
  {
    metric: "Success Rate",
    alpha: "94.2%",
    beta: "87.1%",
    winner: "alpha",
    recommendation: "Beta required errors handling improvement",
  },
  {
    metric: "Drop-offs",
    alpha: "12.3%",
    beta: "18.7%",
    winner: "alpha",
    recommendation: "Beta needs UX flows optimization",
  },
]

const userBehavior = [
  {
    metric: "Adoption Rate",
    alpha: "73.4%",
    beta: "61.2%",
    winner: "alpha",
    recommendation: "Beta needs onboarding improvements",
  },
  {
    metric: "Productivity Score",
    alpha: "6.8/10",
    beta: "8.1/10",
    winner: "beta",
    recommendation: "Alpha should adopt Beta's workflow tools",
  },
  {
    metric: "Retention",
    alpha: "89.3%",
    beta: "76.5%",
    winner: "alpha",
    recommendation: "Beta needs engagement features from Alpha",
  },
  {
    metric: "Churn Triggers",
    alpha: "3 main",
    beta: "7 main",
    winner: "alpha",
    recommendation: "Beta has too many friction points",
  },
]

const financials = [
  {
    metric: "Revenue/Feature",
    alpha: "$1,247",
    beta: "$2,134",
    winner: "beta",
    recommendation: "Alpha needs better monetization Strategy",
  },
  {
    metric: "Gas Efficiency",
    alpha: "0.023 ETH",
    beta: "0.041 ETH",
    winner: "alpha",
    recommendation: "Beta needs smart contract optimization",
  },
  {
    metric: "Fees Structure",
    alpha: "2.5%",
    beta: "1.8%",
    winner: "beta",
    recommendation: "Alpha fees are too high for market",
  },
  {
    metric: "Cash in",
    alpha: "$847K",
    beta: "$623K",
    winner: "alpha",
    recommendation: "Beta needs user acquisition boost",
  },
]

const growth = [
  {
    metric: "Mom Growth",
    alpha: "24.7%",
    beta: "16.3%",
    winner: "alpha",
    recommendation: "Beta growth strategy needs revision",
  },
  {
    metric: "GitHub Activity",
    alpha: "143 commits",
    beta: "287 commits",
    winner: "beta",
    recommendation: "Alpha development pace is slow",
  },
]

function ComparisonTable({
  title,
  data,
  icon: Icon,
}: { title: string; data: typeof featureUsage; icon: React.ElementType }) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="text-sm text-muted-foreground border-b">
              <th className="text-left py-2 font-medium">Metric</th>
              <th className="text-left py-2 font-medium">Project Alpha</th>
              <th className="text-left py-2 font-medium">Project Beta</th>
              <th className="text-left py-2 font-medium">Winner</th>
              <th className="text-left py-2 font-medium">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 1 ? "bg-muted/30" : ""}>
                <td className="py-3 text-sm">{row.metric}</td>
                <td className={`py-3 text-sm ${row.winner === "alpha" ? "text-green-500" : "text-red-500"}`}>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${row.winner === "alpha" ? "bg-green-500" : "bg-red-500"}`}
                    />
                    {row.alpha}
                  </span>
                </td>
                <td className={`py-3 text-sm ${row.winner === "beta" ? "text-green-500" : "text-red-500"}`}>
                  <span className="inline-flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${row.winner === "beta" ? "bg-green-500" : "bg-red-500"}`} />
                    {row.beta}
                  </span>
                </td>
                <td className="py-3">
                  <Trophy className="h-4 w-4 text-green-500" />
                </td>
                <td className="py-3 text-sm text-muted-foreground">{row.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export default function ComparePage() {
  return (
    <div className="p-6">
      <DashboardHeader
        title="Compared Project"
        action={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        }
      />

      {/* Project Selection */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Project A (Baseline)</label>
          <Select defaultValue="alpha">
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alpha">Project Alpha</SelectItem>
              <SelectItem value="gamma">Project Gamma</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">Active Since Jan 2025</p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Project B (Compare Against)</label>
          <Select defaultValue="beta">
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beta">Project Beta</SelectItem>
              <SelectItem value="delta">Project Delta</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">Active Since Mar 2025</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mt-6">
        <h3 className="font-semibold mb-4">Executive Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          {executiveSummary.map((item, i) => (
            <Card key={i} className={item.color}>
              <CardContent className="flex items-center gap-3 p-4">
                <item.icon className="h-5 w-5" />
                <div>
                  <p className="text-sm opacity-80">{item.label}</p>
                  <p className="font-semibold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Comparison Tables */}
      <ComparisonTable title="Feature Usage" data={featureUsage} icon={Settings} />
      <ComparisonTable title="User Behavior" data={userBehavior} icon={Settings} />
      <ComparisonTable title="Financials" data={financials} icon={Settings} />
      <ComparisonTable title="Growth & Development" data={growth} icon={TrendingUp} />
    </div>
  )
}
