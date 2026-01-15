"use client"

import { Card, CardContent } from "@/components/ui/card"

export function WalletMetrics() {
    return (
        <div className="grid grid-cols-4 gap-6">
            <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                <CardContent className="p-6">
                    <div className="text-sm text-[#4B5563] mb-3">Active wallet</div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-3xl font-bold text-[#10B981]">1,247</div>
                        <div className="text-sm font-semibold text-[#10B981]">↗ 12.5%</div>
                    </div>
                    <div className="text-xs text-[#9CA3AF]">vs Last Month</div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                <CardContent className="p-6">
                    <div className="text-sm text-[#4B5563] mb-3">Total Volume</div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-3xl font-bold text-[#10B981]">$2.4M</div>
                        <div className="text-sm font-semibold text-[#10B981]">↗ 15.5%</div>
                    </div>
                    <div className="text-xs text-[#9CA3AF]">in transactions</div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                <CardContent className="p-6">
                    <div className="text-sm text-[#4B5563] mb-3">Aug Gas Fee</div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-3xl font-bold text-[#EF4444]">$12.40</div>
                        <div className="text-sm font-semibold text-[#EF4444]">↘ 12.5%</div>
                    </div>
                    <div className="text-xs text-[#9CA3AF]">52% above competitors</div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                <CardContent className="p-6">
                    <div className="text-sm text-[#4B5563] mb-3">Failed Tx Rate</div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <div className="text-3xl font-bold text-[#EF4444]">8.5%</div>
                    </div>
                    <div className="text-xs text-[#9CA3AF]">Needs Improvement</div>
                </CardContent>
            </Card>
        </div>
    )
}
