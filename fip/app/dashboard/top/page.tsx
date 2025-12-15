"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

const topProjects = Array.from({ length: 10 }, (_, i) => ({
  rank: `#${i + 1}`,
  project: "uniswap",
  revenue: "$1.22M",
  retention: "92%",
  growth: "+92.6%",
}))

const failingProjects = Array.from({ length: 10 }, (_, i) => ({
  rank: `#${91 + i}`,
  project: "uniswap",
  revenue: "$1.22M",
  retention: "92%",
  growth: "+92.6%",
}))

export default function TopFailingPage() {
  return (
    <div className="p-6">
      <DashboardHeader
        title="Project Performance Rankings"
        subtitle="An overview of top and failing project based on key performance indicators."
      />

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Top Projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Project
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ranked by highest overall performance across all KPIs</p>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-2 font-medium">RANK</th>
                  <th className="text-left py-2 font-medium">PROJECT</th>
                  <th className="text-left py-2 font-medium">REVENUE</th>
                  <th className="text-left py-2 font-medium">RETENTION</th>
                  <th className="text-left py-2 font-medium">GROWTH</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((project, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 text-sm font-medium">{project.rank}</td>
                    <td className="py-3 text-sm">{project.project}</td>
                    <td className="py-3 text-sm">{project.revenue}</td>
                    <td className="py-3 text-sm">{project.retention}</td>
                    <td className="py-3 text-sm text-green-500">{project.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Failing Projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Failing Project
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ranked by lowest overall performance. Requires attention</p>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-2 font-medium">RANK</th>
                  <th className="text-left py-2 font-medium">PROJECT</th>
                  <th className="text-left py-2 font-medium">REVENUE</th>
                  <th className="text-left py-2 font-medium">RETENTION</th>
                  <th className="text-left py-2 font-medium">GROWTH</th>
                </tr>
              </thead>
              <tbody>
                {failingProjects.map((project, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 text-sm font-medium">{project.rank}</td>
                    <td className="py-3 text-sm">{project.project}</td>
                    <td className="py-3 text-sm">{project.revenue}</td>
                    <td className="py-3 text-sm">{project.retention}</td>
                    <td className="py-3 text-sm text-green-500">{project.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
