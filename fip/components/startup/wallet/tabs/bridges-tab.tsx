"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, ArrowLeft } from "lucide-react"

export function BridgesTab() {
    return (
        <div className="space-y-12">

            {/* Funds Coming In */}
            <div className="bg-[#EBEEF2]/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#DCFCE7] rounded-xl text-[#059669] shadow-sm"><ArrowRight className="w-5 h-5" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-[#111827]">Funds Coming In</h3>
                        <p className="text-sm text-[#6B7280]">Tracking bridged funds entering my chain</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Total Volume</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">$1.2M</span>
                                <span className="text-sm font-semibold text-[#10B981]">↗ 15.5%</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Total Volume</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">94.2%</span>
                                <span className="text-sm font-semibold text-[#10B981]">↗ 3.2%</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Failed Tx</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#F59E0B] font-mono">18</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Avg Gas</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">$8.40</span>
                                <span className="text-sm font-semibold text-[#10B981]">↗ 5.5%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3 font-medium">Time to First Tx</div>
                            <div className="text-2xl font-bold text-[#111827] font-mono">4.2m</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3 font-medium">Avg Inflow</div>
                            <div className="text-2xl font-bold text-[#10B981] font-mono">$3,240</div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3 font-medium">Features Used</div>
                            <div className="text-2xl font-bold text-[#4B5563] font-mono">8.4</div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Funds Leaving */}
            <div className="bg-[#EBEEF2]/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-[#DCFCE7] rounded-xl text-[#059669] shadow-sm"><ArrowRight className="w-5 h-5 transition-transform rotate-0" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-[#111827]">Funds Leaving</h3>
                        <p className="text-sm text-[#6B7280]">Tracking bridged funds existing my chain</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Total Volume</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#F59E0B] font-mono">$890k</span>
                                <span className="text-sm font-semibold text-[#F59E0B]">↗ 15.5%</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Total Volume</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">96.8%</span>
                                <span className="text-sm font-semibold text-[#10B981]">↗ 1.5%</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Failed Tx</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">12</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm rounded-2xl">
                        <CardContent className="p-6">
                            <div className="text-sm text-[#4B5563] mb-3">Avg Gas</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-[#10B981] font-mono">$7.20</span>
                                <span className="text-sm font-semibold text-[#10B981]">↗ 5.5%</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="border border-[#FDE68A] bg-[#FFFBEB] rounded-2xl p-6 flex justify-between items-center shadow-sm">
                    <div>
                        <div className="text-sm text-[#92400E] font-semibold mb-3">Active wallet</div>
                        <div className="text-3xl font-bold text-[#111827] mb-2 font-mono">234</div>
                        <p className="text-xs text-[#6B7280] font-medium">High exist rate after app usage consider rentention strategies</p>
                    </div>
                    <div className="border border-[#F59E0B] text-[#D97706] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase bg-white">Need Attention</div>
                </div>
            </div>

        </div>
    )
}
