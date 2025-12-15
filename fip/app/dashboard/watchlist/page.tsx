"use client"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Bell, AlertTriangle, TrendingUp, Wallet, ExternalLink, Plus, Users, TrendingDown } from "lucide-react"

const activeAlerts = [
  {
    id: 1,
    title: "Retention Alert Triggered",
    description: "DeFi protocol retention drops 10 19% (below 20% threshold)",
    type: "critical",
    time: "2 hours ago",
    icon: AlertTriangle,
  },
  {
    id: 2,
    title: "Growth Milestone Reached",
    description: "NFT Marketplace adoption grew 35% in 7days",
    type: "positive",
    time: "6 hours ago",
    icon: TrendingUp,
  },
  {
    id: 3,
    title: "Wallet Anomaly Detected",
    description: "Unsuldge-out activity in web3 Gaming project",
    type: "warning",
    time: "2 day ago",
    icon: Wallet,
  },
]

const watchlistedProjects = [
  {
    id: 1,
    name: "Defi Protocol",
    description: "Decentralized exchange platform",
    users: "45k users",
    metric: "-23% retention",
    metricType: "negative",
    status: "Alert Active",
    color: "bg-indigo-500",
    letter: "D",
  },
  {
    id: 2,
    name: "NFT Marketplace",
    description: "Digital collectibles platforms",
    users: "23k users",
    metric: "+35% growth",
    metricType: "positive",
    status: "performing Well",
    color: "bg-teal-400",
    letter: "N",
  },
]

export default function WatchlistPage() {
  const [alertFrequency, setAlertFrequency] = useState("immediate")
  const [adoptionPercent, setAdoptionPercent] = useState("25")
  const [adoptionDays, setAdoptionDays] = useState("7")
  const [retentionDrop, setRetentionDrop] = useState("20")
  const [revenueThreshold, setRevenueThreshold] = useState("100,000")
  const [featureUsage, setFeatureUsage] = useState("100,000")

  return (
    <div className="p-6">
      <DashboardHeader
        title="Watchlist & Alert"
        action={
          <Button className="bg-primary text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Alert
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Alert Configuration */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Alert Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground">Set up custom alerts for your watchlisted project</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Checkbox id="alert-types" defaultChecked />
                <Label htmlFor="alert-types">Alert Types</Label>
              </h4>
              <div className="flex items-center gap-2 ml-6 text-sm">
                <span className="text-muted-foreground">Notify it adoption grows by</span>
                <Input
                  value={adoptionPercent}
                  onChange={(e) => setAdoptionPercent(e.target.value)}
                  className="w-16 h-8 text-center"
                />
                <span className="text-muted-foreground">% in</span>
                <Input
                  value={adoptionDays}
                  onChange={(e) => setAdoptionDays(e.target.value)}
                  className="w-16 h-8 text-center"
                />
                <span className="text-muted-foreground">days</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Checkbox id="retention-drop" defaultChecked />
                <Label htmlFor="retention-drop">Retention Drop</Label>
              </h4>
              <div className="flex items-center gap-2 ml-6 text-sm">
                <span className="text-muted-foreground">Alert if retention drops below</span>
                <Input
                  value={retentionDrop}
                  onChange={(e) => setRetentionDrop(e.target.value)}
                  className="w-16 h-8 text-center"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Checkbox id="revenue-threshold" defaultChecked />
                <Label htmlFor="revenue-threshold">Revenue Threshold</Label>
              </h4>
              <div className="flex items-center gap-2 ml-6 text-sm">
                <span className="text-muted-foreground">Alert when revenue hits $</span>
                <Input
                  value={revenueThreshold}
                  onChange={(e) => setRevenueThreshold(e.target.value)}
                  className="w-24 h-8 text-center"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Checkbox id="feature-usage" />
                <Label htmlFor="feature-usage">Feature Usage Spike</Label>
              </h4>
              <div className="flex items-center gap-2 ml-6 text-sm">
                <span className="text-muted-foreground">Monitor</span>
                <Input
                  value={featureUsage}
                  onChange={(e) => setFeatureUsage(e.target.value)}
                  className="w-24 h-8 text-center"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Checkbox id="wallet-anomalies" defaultChecked />
                <Label htmlFor="wallet-anomalies">Wallet Anomalies</Label>
              </h4>
              <p className="text-sm text-muted-foreground ml-6">Bridge out, inactivity, drop-off patterns</p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Alert Frequency</h4>
              <RadioGroup value={alertFrequency} onValueChange={setAlertFrequency} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate">Immediate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly">Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">Weekly</Label>
                </div>
              </RadioGroup>
            </div>

            <Button className="w-full bg-primary text-primary-foreground">
              <Bell className="h-4 w-4 mr-2" />
              Save Alert Rules
            </Button>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" />
              Active Alert
            </CardTitle>
            <p className="text-sm text-muted-foreground">Currently monitoring 5 alert conditions</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      alert.type === "critical"
                        ? "bg-red-100 text-red-600"
                        : alert.type === "positive"
                          ? "bg-green-100 text-green-600"
                          : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    <alert.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{alert.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          alert.type === "critical"
                            ? "bg-red-100 text-red-600"
                            : alert.type === "positive"
                              ? "bg-green-100 text-green-600"
                              : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">{alert.time}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="link" className="w-full text-sm">
              View all Alert History
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Watchlisted Projects */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-yellow-500">🔖</span>
              Watchlisted Projects
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">3 project being monitored</p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Alert
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {watchlistedProjects.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${project.color} flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {project.letter}
                  </div>
                  <div>
                    <h4 className="font-medium">{project.name}</h4>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {project.users}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${project.metricType === "positive" ? "text-green-500" : "text-red-500"}`}
                      >
                        {project.metricType === "positive" ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {project.metric}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${project.status === "Alert Active" ? "text-red-500" : "text-green-500"}`}>
                    {project.status}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
