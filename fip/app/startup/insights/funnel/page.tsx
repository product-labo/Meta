"use client"

import { StartupHeader } from "@/components/startup/startup-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const filters = [
  { label: "Date", value: "Last 30 Days" },
  { label: "Segment", value: "All Isers" },
  { label: "Channel", value: "All" },
]

const funnelData = [
  { stage: "Signups", count: 12500, width: 100 },
  { stage: "Activation", count: 4357, width: 70 },
  { stage: "Retention", count: 3112, width: 50 },
  { stage: "Monetization", count: 2162, width: 35 },
]

const statsCards = [
  {
    title: "Signups to Activation Box",
    value: "35%",
    change: "-1.2%",
    up: false,
    description: "Only 35% of signups activate. Improving onboarding is a key opportunity.",
  },
  {
    title: "Activated to Paying",
    value: "60%",
    change: "+5.0%",
    up: true,
    description: "60% of activated users become paying customers within 14 days.",
  },
  {
    title: "Potential MRR Increase",
    value: "4%",
    change: "+0.5%",
    up: true,
    description: "A 10% onboarding improvement could yield a 4% increase in total MRR.",
  },
]

const tableData = [
  { stage: "Signups", userCount: "12,500", conversionRate: "-", dropOffRate: "-" },
  { stage: "Activation", userCount: "4,357", conversionRate: "35.00%", dropOffRate: "65.00%" },
  { stage: "First-Week Retention", userCount: "3,112", conversionRate: "71.42%", dropOffRate: "28.58%" },
  { stage: "Monetization", userCount: "2,162", conversionRate: "84.00%", dropOffRate: "16.00%" },
]

export default function FunnelPage() {
  return (
    <div className="min-h-screen">
      <StartupHeader
        title="Growth & Conversion Funnel"
        subtitle="Visualize where user drop off from acquisition to retention"
        action={
          <Button variant="default" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Share/Export
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex gap-4">
          {filters.map((filter) => (
            <Select key={filter.label} defaultValue={filter.value}>
              <SelectTrigger className="w-40 bg-muted">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={filter.value}>
                  {filter.label}: {filter.value}
                </SelectItem>
              </SelectContent>
            </Select>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Funnel Chart */}
          <div className="col-span-2">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Conversion Funnel</CardTitle>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((item) => (
                    <div key={item.stage} className="flex items-center gap-4">
                      <span className="w-28 text-sm font-medium">{item.stage}</span>
                      <div className="flex-1 relative">
                        <div
                          className="h-10 bg-cyan-400 rounded-full flex items-center justify-end pr-4"
                          style={{ width: `${item.width}%` }}
                        >
                          <span className="text-sm font-semibold text-white">{item.count.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Top Countries & Drop-off Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b">
                      <th className="pb-2 font-medium">Stage</th>
                      <th className="pb-2 font-medium">User Count</th>
                      <th className="pb-2 font-medium">Conversion Rate</th>
                      <th className="pb-2 font-medium">Drop-off Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row) => (
                      <tr key={row.stage} className="border-t">
                        <td className="py-3">{row.stage}</td>
                        <td className="py-3">{row.userCount}</td>
                        <td className="py-3">{row.conversionRate}</td>
                        <td className="py-3 text-red-500">{row.dropOffRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="space-y-4">
            {statsCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-4">
                  <p className="font-semibold">{stat.title}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <span className={`text-sm ${stat.up ? "text-green-600" : "text-red-500"}`}>{stat.change}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
