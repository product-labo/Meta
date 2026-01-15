"use client"

import { Button } from "@/components/ui/button"
import { Share, Hand } from "lucide-react"
import { MetricCard } from "@/components/startup/cards/metric-card"
import { InsightCard } from "@/components/startup/cards/insight-card"
import { Lightbulb, Bell, UserMinus } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard/header"

export default function UsersPage() {
    return (
        <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">

            <DashboardHeader
                title="Users Retention & Churn Insight"
                subtitle="Detect when and why users stop using your product"
                action={
                    <Button className="h-11 px-6 rounded-xl bg-[#111827] text-white hover:bg-gray-800 transition-colors">
                        <Share className="w-4 h-4 mr-2" /> Last 30 Days
                    </Button>
                }
            />

            {/* Metrics Row */}
            <div className="grid grid-cols-4 gap-6">
                <MetricCard title="Overall Retention Rate" value="42.8%" change="2.1%" trend="up" />
                <MetricCard title="Churn Rate" value="5.2%" change="-0.5%" trend="down" />
                <MetricCard title="Average Users Lifetime" value="98 days" change="+5 days" trend="up" />
                <MetricCard title="Average Session Duration" value="8m 15s" change="-1m 02s" trend="down" />
            </div>

            {/* Insight Section */}
            <div className="space-y-4 rounded-xl bg-muted/10 p-6">
                <h3 className="font-semibold text-lg">Key Insight</h3>
                <div className="space-y-4">
                    <InsightCard
                        type="high"
                        icon={Hand}
                        title="Onboarding Drop-off at Step 3"
                        description="Drop-off rate spikes after Step 3 in onboarding — average time to complete Step 3 is 45 seconds longer than peers."
                        actionLabel="Explore Data"
                        tag="Business Value: Optimize Onboarding Flow"
                    />
                    <InsightCard
                        type="low"
                        icon={Bell}
                        title="High Engagement from Push Notifications"
                        description="Returning users engage 2.5x longer when push notifications are enabled, correlating with higher feature adoption."
                        actionLabel="View Details"
                        tag="Business Value: Enhance Lifetime Value (LTV)"
                    />
                    <InsightCard
                        type="medium"
                        icon={UserMinus}
                        title='High Churn Risk for "Freemium" Segment'
                        description="Users on the Freemium plan who don't use Feature X within 7 days have an 82% churn probability."
                        actionLabel="See Segments"
                        tag="Business Value: Reduce Friction"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Users Activity Funnel */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg">Users Activity Funnel</h3>
                        <p className="text-sm text-muted-foreground">Onboarding journey user drop-off point</p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { step: 1, name: "Account Created", val: 100, color: "bg-blue-500" },
                            { step: 2, name: "Profile Created", val: 91, color: "bg-blue-400" },
                            { step: 3, name: "First API Call", val: 64, color: "bg-red-400", alert: "-21% Drop-off" },
                            { step: 4, name: "Invited Teammate", val: 58, color: "bg-blue-300" },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-xs font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 rounded-full ${item.step === 3 ? "bg-red-100 text-red-500" : "bg-blue-100 text-blue-500"} flex items-center justify-center text-[10px]`}>{item.step}</div>
                                        {item.name}
                                    </div>
                                    <span>{item.val}%</span>
                                </div>
                                <div className="relative h-4 bg-muted/20 rounded-full overflow-hidden">
                                    <div className={`absolute top-0 left-0 h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                                    {item.alert && <div className="absolute top-0 right-10 text-[8px] text-red-500 font-bold bg-white/80 px-1 rounded">{item.alert}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Retention Over Time */}
                <div className="rounded-xl border bg-card p-6">
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg">Retention Over Time</h3>
                        <p className="text-sm text-muted-foreground">User Cohort from the last 5 weeks</p>
                    </div>

                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-5 text-sm text-muted-foreground text-center">
                            <div className="text-left pl-2">Cohort</div>
                            <div>Week 0</div>
                            <div>Week 1</div>
                            <div>Week 2</div>
                            <div>Week 3</div>
                        </div>
                        {/* Rows */}
                        {[
                            { name: "May 25 - Jun 2", users: "180 Users", data: [100, 48.2, 35.1, 29.8] },
                            { name: "Jun 3 - Jun 9", users: "210 Users", data: [100, 55.3, 42.7, 33.1] },
                            { name: "Jun 10 - Jun 16", users: "195 Users", data: [100, 45.9, 38.2] },
                            { name: "Jun 17 - Jun 23", users: "250 Users", data: [100, 58.0] },
                            { name: "Jun 24 - Jun 30", users: "233 Users", data: [100] },
                        ].map((row, i) => (
                            <div key={i} className="grid grid-cols-5 items-center">
                                <div className="text-left px-2">
                                    <div className="text-sm font-medium">{row.name}</div>
                                    <div className="text-xs text-muted-foreground">{row.users}</div>
                                </div>
                                {Array.from({ length: 4 }).map((_, j) => (
                                    <div key={j} className="flex justify-center">
                                        {row.data[j] !== undefined && (
                                            <div
                                                className={`text-[10px] font-medium px-2 py-1 rounded ${row.data[j] >= 50 ? "bg-blue-400 text-white" : row.data[j] >= 30 ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-600"}`}
                                            >
                                                {row.data[j]}%
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
