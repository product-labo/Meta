"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, User, Wallet, GitCompare, Activity, ArrowLeftRight, LineChart } from "lucide-react"
import { WalletMetrics } from "@/components/startup/wallet/wallet-metrics"
import { WalletTab } from "@/components/startup/wallet/tabs/wallet-tab"
import { ComparisonTab } from "@/components/startup/wallet/tabs/comparison-tab"
import { ActivityTab } from "@/components/startup/wallet/tabs/activity-tab"
import { BridgesTab } from "@/components/startup/wallet/tabs/bridges-tab"
import { InsightTab } from "@/components/startup/wallet/tabs/insight-tab"


import { DashboardHeader } from "@/components/dashboard/header"


export default function WalletIntelligencePage() {
    return (
        <div className="p-8 space-y-10 min-h-screen bg-[#F9FAFB]">
            {/* Header */}
            <DashboardHeader
                title="Wallet intelligence"
                subtitle="Advance analytics for your web 3 app"
            />

            {/* Shared Metrics */}
            <WalletMetrics />

            {/* Tabs */}
            <Tabs defaultValue="wallet" className="w-full">
                <TabsList className="bg-gray-100/50 border border-gray-200 h-11 p-1 gap-1 rounded-xl w-fit">
                    <TabsTrigger value="wallet" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#111827] text-[#6B7280] gap-2 text-sm font-medium transition-all">
                        <Wallet className="w-4 h-4" /> Wallet
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#111827] text-[#6B7280] gap-2 text-sm font-medium transition-all">
                        <GitCompare className="w-4 h-4" /> Comparison
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#111827] text-[#6B7280] gap-2 text-sm font-medium transition-all">
                        <Activity className="w-4 h-4" /> Activity
                    </TabsTrigger>
                    <TabsTrigger value="bridges" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#111827] text-[#6B7280] gap-2 text-sm font-medium transition-all">
                        <ArrowLeftRight className="w-4 h-4" /> Bridges
                    </TabsTrigger>
                    <TabsTrigger value="insight" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#111827] text-[#6B7280] gap-2 text-sm font-medium transition-all">
                        <LineChart className="w-4 h-4" /> Insight
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="wallet" className="mt-8">
                    <WalletTab />
                </TabsContent>
                <TabsContent value="comparison" className="mt-8">
                    <ComparisonTab />
                </TabsContent>
                <TabsContent value="activity" className="mt-8">
                    <ActivityTab />
                </TabsContent>
                <TabsContent value="bridges" className="mt-8">
                    <BridgesTab />
                </TabsContent>
                <TabsContent value="insight" className="mt-8">
                    <InsightTab />
                </TabsContent>
            </Tabs>

        </div>
    )
}
