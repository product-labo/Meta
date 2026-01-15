"use client"

import { Card, CardContent } from "@/components/ui/card"
import { WalletTab } from "./wallet-tab" // Reusing the table from WalletTab as the image shows the same table structure at bottom
// Actually the bottom table is "Recent Active Wallet", same structure.

export function ActivityTab() {
    return (
        <div className="space-y-12">
            <div className="grid grid-cols-2 gap-12">
                {/* Activity Inside App */}
                <div className="space-y-6">
                    <h3 className="text-base font-bold text-[#111827]">Activity Inside App</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Transactions</div>
                                <div className="text-3xl font-bold text-[#10B981]">2,456</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Features Used</div>
                                <div className="text-3xl font-bold text-[#4B5563]">12</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Avg Session</div>
                                <div className="text-3xl font-bold text-[#10B981]">45m</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Success Rate</div>
                                <div className="text-3xl font-bold text-[#F59E0B]">91.5%</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Activity Outside App */}
                <div className="space-y-6">
                    <h3 className="text-base font-bold text-[#111827]">Activity Outside App</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Transactions</div>
                                <div className="text-3xl font-bold text-[#4B5563]">8,234</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">App Used</div>
                                <div className="text-3xl font-bold text-[#4B5563]">4.2</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Aug Session</div>
                                <div className="text-3xl font-bold text-[#F59E0B]">$234K</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <div className="text-sm text-[#6B7280] mb-3">Success Rate</div>
                                <div className="text-3xl font-bold text-[#10B981]">95.8%</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Reusing the table structure for "Recent Active Wallet" */}
            <div className="space-y-6">
                <h3 className="text-base font-bold text-[#111827]">Recent Active Wallet</h3>
                <WalletTab />
            </div>
        </div>
    )
}
