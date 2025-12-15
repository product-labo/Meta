"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, User, Wallet, GitCompare, Activity, ArrowLeftRight, LineChart } from "lucide-react"
import { WalletMetrics } from "@/components/startup/wallet/wallet-metrics"
import { WalletTab } from "@/components/startup/wallet/tabs/wallet-tab"
import { ComparisonTab } from "@/components/startup/wallet/tabs/comparison-tab"
import { ActivityTab } from "@/components/startup/wallet/tabs/activity-tab"
import { BridgesTab } from "@/components/startup/wallet/tabs/bridges-tab"
import { InsightTab } from "@/components/startup/wallet/tabs/insight-tab"


export default function WalletIntelligencePage() {
    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Wallet intelligence</h1>
                    <p className="text-muted-foreground">Advance analytics for your web 3 app</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center relative">
                            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">2</div>
                            <Bell className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <span className="text-xs">👤</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared Metrics */}
            <WalletMetrics />

            {/* Tabs */}
            <Tabs defaultValue="wallet" className="w-full">
                <TabsList className="bg-white border h-12 p-1 gap-2 rounded-lg">
                    <TabsTrigger value="wallet" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground text-muted-foreground gap-2 text-xs">
                        <Wallet className="w-3 h-3" /> Wallet
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground text-muted-foreground gap-2 text-xs">
                        <GitCompare className="w-3 h-3" /> Comparison
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground text-muted-foreground gap-2 text-xs">
                        <Activity className="w-3 h-3" /> Activity
                    </TabsTrigger>
                    <TabsTrigger value="bridges" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground text-muted-foreground gap-2 text-xs">
                        <ArrowLeftRight className="w-3 h-3" /> Bridges
                    </TabsTrigger>
                    <TabsTrigger value="insight" className="data-[state=active]:bg-slate-100 data-[state=active]:text-foreground text-muted-foreground gap-2 text-xs">
                        <LineChart className="w-3 h-3" /> Insight
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="wallet" className="mt-6">
                    <WalletTab />
                </TabsContent>
                <TabsContent value="comparison" className="mt-6">
                    <ComparisonTab />
                </TabsContent>
                <TabsContent value="activity" className="mt-6">
                    <ActivityTab />
                </TabsContent>
                <TabsContent value="bridges" className="mt-6">
                    <BridgesTab />
                </TabsContent>
                <TabsContent value="insight" className="mt-6">
                    <InsightTab />
                </TabsContent>
            </Tabs>

        </div>
    )
}
