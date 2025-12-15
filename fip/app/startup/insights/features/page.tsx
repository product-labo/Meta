"use client"

import { StartupHeader } from "@/components/startup/startup-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Zap } from "lucide-react"

const timeFilters = ["Last 7 Day", "Last 30 Days", "Last Quarter", "All Time"]

const insightCards = [
  [
    {
      title: "Core Insight",
      value: "3X",
      description: "Users who use Feature X early are more likely to be retained",
      tag: "+200% Retention",
      tagColor: "text-green-600",
    },
    {
      title: "High Engagement",
      value: "4.5X",
      description: "Repeat use of Feature X correlates with long-term retention.",
      tag: "+350% Retention",
      tagColor: "text-green-600",
    },
    {
      title: "Discoverability Gap",
      value: "8%",
      description: "Feature Y is used by only 8% of new users. Consider improving onboarding.",
      tag: "Low Adoption",
      tagColor: "text-orange-600",
    },
    {
      title: "Most Adopted Feature",
      value: "65%",
      description: "Feature Z is the most-used feature in the first week.",
      tag: "High Interaction Rate",
      tagColor: "text-green-600",
    },
  ],
  [
    {
      title: "Feature Fatigue",
      value: "-70%",
      description: "Usage of Feature Q drops sharply after day 5, low sustained value.",
      tag: "Usage Drop",
      tagColor: "text-red-500",
    },
    {
      title: "Feature Synergy",
      value: "2.8X",
      description: "Using Features X & Y together boosts conversion rates.",
      tag: "+180% Conversion",
      tagColor: "text-green-600",
    },
    {
      title: "Onboarding Drop-Off",
      value: "40%",
      description: "40% of users abandon onboarding at Feature Z's introduction.",
      tag: "High Churn Point",
      tagColor: "text-orange-600",
    },
    {
      title: "Top Revenue Feature",
      value: "52%",
      description: "Feature B drives the majority of revenue events despite low engagement.",
      tag: "of Total Revenue",
      tagColor: "text-green-600",
    },
  ],
  [
    {
      title: "Latent Opportunity",
      value: "+35%",
      description: "Feature D adoption is growing rapidly month-over-month.",
      tag: "MoM Growth",
      tagColor: "text-green-600",
    },
    {
      title: "Negative Impact",
      value: "1.8X",
      description: "Early engagement with Feature E correlates with higher churn.",
      tag: "More Likely to Churn",
      tagColor: "text-red-500",
    },
    {
      title: "Hidden Power Feature",
      value: "5X",
      description: "Undiscovered Feature M leads to significantly longer sessions.",
      tag: "Longer Sessions",
      tagColor: "text-green-600",
    },
  ],
]

const featureTable = [
  {
    feature: "Feature X",
    week1: "30%",
    correlation: "+200",
    impact: "Moderate",
    recommendation: "Promote in Onboarding",
  },
  {
    feature: "Feature Y",
    week1: "8%",
    correlation: "Neutral",
    impact: "Low",
    recommendation: "Promote in Onboarding",
    week1Color: "text-green-600",
  },
  {
    feature: "Feature Z",
    week1: "65%",
    correlation: "Low",
    impact: "Low",
    recommendation: "Promote in Onboarding",
    week1Color: "text-green-600",
  },
  {
    feature: "Feature B",
    week1: "20%",
    correlation: "Moderate",
    impact: "High (52%)",
    recommendation: "Promote in Onboarding",
    impactColor: "text-green-600",
  },
  {
    feature: "Feature M",
    week1: "12%",
    correlation: "Very High",
    impact: "Moderate",
    recommendation: "Promote in Onboarding",
    week1Color: "text-green-600",
    correlationColor: "text-green-600",
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <StartupHeader
        title="Features Adoption Insight Center"
        subtitle="Understand early features adoption, engagement correlation, and long-term growth drivers"
        action={
          <Button variant="default" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Share/Export
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Time Filters */}
        <div className="flex gap-2">
          {timeFilters.map((filter, i) => (
            <Button key={filter} variant={i === 1 ? "secondary" : "outline"} size="sm">
              {filter}
              {(i === 1 || i === 2 || i === 3) && <span className="ml-1">▼</span>}
            </Button>
          ))}
        </div>

        {/* Insight Cards Grid */}
        <div className="space-y-4">
          {insightCards.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-4 gap-4">
              {row.map((card, i) => (
                <Card key={i} className="border-t-4 border-t-yellow-400">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{card.title}</span>
                    </div>
                    <p className="text-3xl font-bold">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-2">{card.description}</p>
                    <p className={`text-xs mt-2 ${card.tagColor}`}>{card.tag}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>

        {/* Features Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left border-b bg-muted/50">
                  <th className="p-4 font-medium">Features</th>
                  <th className="p-4 font-medium">%of Users (Week 1)</th>
                  <th className="p-4 font-medium">Retention Correlation</th>
                  <th className="p-4 font-medium">Revenue Impact</th>
                  <th className="p-4 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {featureTable.map((row) => (
                  <tr key={row.feature} className="border-t">
                    <td className="p-4">{row.feature}</td>
                    <td className={`p-4 ${row.week1Color || ""}`}>{row.week1}</td>
                    <td className={`p-4 ${row.correlationColor || ""}`}>{row.correlation}</td>
                    <td className={`p-4 ${row.impactColor || ""}`}>{row.impact}</td>
                    <td className="p-4">{row.recommendation}</td>
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
