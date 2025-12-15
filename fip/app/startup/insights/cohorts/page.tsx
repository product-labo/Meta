"use client"

import { StartupHeader } from "@/components/startup/startup-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react"

const stats = [
  { label: "Total Users", value: "39,894", change: "-12.5%", up: false },
  { label: "Avg Retention", value: "62.8%", change: "-4.5%", up: false },
  { label: "Revenue/Users", value: "$127.40", change: "-2.1%", up: false },
  { label: "Active Cohorts", value: "4", change: "-0%", up: false },
]

const cohorts = [
  {
    name: "Cohort A",
    type: "Referral Users",
    risk: "Low Risk",
    riskColor: "text-green-600",
    riskIcon: CheckCircle,
    users: "12,847",
    retention: "78%",
    retentionColor: "text-green-600",
    revenue: "$1.4 Revenue",
    platform: "Cross-platform",
    barData: [80, 90, 85, 95, 88, 92, 78, 85, 90, 88, 92, 95],
    barColor: "bg-green-500",
  },
  {
    name: "Cohort B",
    type: "IOS Organic",
    risk: "Low Risk",
    riskColor: "text-red-500",
    riskIcon: AlertTriangle,
    users: "8,234",
    retention: "32%",
    retentionColor: "text-red-500",
    revenue: "$0.7 Revenue",
    platform: "iOS",
    barData: [60, 70, 45, 55, 40, 50, 35, 45, 30, 40, 25, 35],
    barColor: "bg-red-500",
  },
  {
    name: "Cohort C",
    type: "Paid Acquisition",
    risk: "Medium Risk",
    riskColor: "text-yellow-600",
    riskIcon: AlertTriangle,
    users: "15,392",
    retention: "52%",
    retentionColor: "text-red-500",
    revenue: "$1.1 Revenue",
    platform: "Android",
    barData: [70, 80, 65, 75, 60, 70, 55, 65, 50, 55, 45, 40],
    barColor: "bg-yellow-500",
  },
  {
    name: "Cohort D",
    type: "Enterprise Users",
    risk: "Low Risk",
    riskColor: "text-green-600",
    riskIcon: CheckCircle,
    users: "3,421",
    retention: "89%",
    retentionColor: "text-green-600",
    revenue: "$2.8 Revenue",
    platform: "Web",
    barData: [85, 90, 88, 92, 95, 90, 88, 92, 95, 90, 92, 95],
    barColor: "bg-green-500",
  },
]

export default function CohortsPage() {
  return (
    <div className="min-h-screen">
      <StartupHeader
        title="Behavioral Cohorts Insight"
        subtitle="Analyze users patter amd outcomes"
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${stat.up ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cohort Cards */}
        <div className="grid grid-cols-2 gap-4">
          {cohorts.map((cohort) => (
            <Card key={cohort.name} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-semibold">{cohort.name}</p>
                      <p className="text-sm text-muted-foreground">{cohort.type}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs ${cohort.riskColor}`}>
                    <cohort.riskIcon className="h-3 w-3" />
                    {cohort.risk}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>👥</span> User
                    </p>
                    <p className="font-semibold">{cohort.users}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>⏱️</span> Retention
                    </p>
                    <p className={`font-semibold ${cohort.retentionColor}`}>{cohort.retention}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-green-600">{cohort.revenue}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{cohort.platform}</span>
                </div>

                <div className="flex items-end gap-0.5 h-12">
                  {cohort.barData.map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 ${cohort.barColor} rounded-sm`}
                      style={{ height: `${height}%`, opacity: i > 8 ? 0.3 : 1 }}
                    />
                  ))}
                </div>
              </CardContent>

              {cohort.name === "Cohort A" && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 bg-green-50 border border-green-200 rounded-lg p-3 shadow-lg w-56">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Referral user outcome</span>
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">+140 Revenue</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Competitor B's new 'Quick Actions' feature caused a Similar functionality could close your
                    engagement gap.
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
