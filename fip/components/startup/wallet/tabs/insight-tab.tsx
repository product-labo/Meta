"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, CheckCircle2, Lightbulb } from "lucide-react"

export function InsightTab() {
    return (
        <div className="space-y-6 bg-[#EBEEF2]/50 p-6 rounded-2xl border border-gray-100">
            <div>
                <h3 className="text-xl font-bold text-[#111827] mb-1">Analysis & Insights</h3>
                <p className="text-sm text-[#6B7280] mb-8">AI-Powered recommendations to improve your productivity</p>
            </div>

            <div className="space-y-4">
                {/* Insight 1 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-red-50 rounded-lg"><AlertCircle className="w-5 h-5 text-[#EF4444]" /></div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-[#111827]">High Gas Fee</h4>
                                <span className="bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Critical</span>
                            </div>
                            <p className="text-sm text-[#6B7280] mb-4 max-w-2xl leading-relaxed">
                                Your Avg gas fee is ($12.40) 52% higher that your competitors optimize contract call to reduce costs
                            </p>
                            <Button variant="outline" className="h-8 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#374151] font-semibold px-4 rounded-lg">Optimize Gas Usage</Button>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-[#6B7280]">+52%</div>
                </div>

                {/* Insight 2 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-red-50 rounded-lg"><AlertCircle className="w-5 h-5 text-[#EF4444]" /></div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-[#111827]">Failed Transaction Rate</h4>
                                <span className="bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Critical</span>
                            </div>
                            <p className="text-sm text-[#6B7280] mb-4 max-w-2xl leading-relaxed">
                                8.5% failed rate is above industry standard. review transaction validation and errors handling
                            </p>
                            <Button variant="outline" className="h-8 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#374151] font-semibold px-4 rounded-lg">Review Errors Logs</Button>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-[#6B7280]">+52%</div>
                </div>

                {/* Insight 3 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-amber-50 rounded-lg">
                            <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-[#111827]">Wallet Activity Outside App</h4>
                                <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Warning</span>
                            </div>
                            <p className="text-sm text-[#6B7280] mb-4 max-w-2xl leading-relaxed">
                                Active wallet are spending $2,345 elsewhere Vs $345 in your app. Focus on features engagement
                            </p>
                            <Button variant="outline" className="h-8 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#374151] font-semibold px-4 rounded-lg">View Activity Report</Button>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-[#6B7280]">+52%</div>
                </div>

                {/* Insight 4 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-indigo-50 rounded-lg"><Lightbulb className="w-5 h-5 text-[#4F46E5]" /></div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-[#111827]">Improve Features Adoption</h4>
                                <span className="bg-[#E0E7FF] text-[#3730A3] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Suggestion</span>
                            </div>
                            <p className="text-sm text-[#6B7280] mb-4 max-w-2xl leading-relaxed">
                                App A has 50% higher features usage. Consider Implementing same workflows and user onboarding
                            </p>
                            <Button variant="outline" className="h-8 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#374151] font-semibold px-4 rounded-lg">View Feature Analysis</Button>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-[#6B7280]">+52%</div>
                </div>

                {/* Insight 5 */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex gap-4 items-start">
                        <div className="mt-1 p-2 bg-indigo-50 rounded-lg"><Lightbulb className="w-5 h-5 text-[#4F46E5]" /></div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-base font-bold text-[#111827]">Bridge Optimization</h4>
                                <span className="bg-[#E0E7FF] text-[#3730A3] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Suggestion</span>
                            </div>
                            <p className="text-sm text-[#6B7280] mb-4 max-w-2xl leading-relaxed">
                                Track 234 wallet bridging out after using your app. Improve retention with better incentives
                            </p>
                            <Button variant="outline" className="h-8 text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-[#374151] font-semibold px-4 rounded-lg">View Bridge Data</Button>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-[#6B7280]">+52%</div>
                </div>

            </div>
        </div>
    )
}
