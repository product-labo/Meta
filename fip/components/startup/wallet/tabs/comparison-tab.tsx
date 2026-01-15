"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function ComparisonTab() {
    return (
        <div className="space-y-6">
            <div className="bg-[#EBEEF2]/50 p-6 rounded-2xl border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-[#111827]">App Comparison</h3>
                    <p className="text-sm text-[#6B7280]">See how your app performs against competitors</p>
                </div>

                <div className="rounded-xl overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-white border-b-0">
                            <TableRow className="hover:bg-transparent border-b-0">
                                <TableHead className="w-[200px] py-4 bg-white"></TableHead>
                                <TableHead className="text-center text-sm font-bold text-[#111827] py-4 bg-white">My App</TableHead>
                                <TableHead className="text-center text-sm font-semibold text-[#6B7280] py-4 bg-white">App A</TableHead>
                                <TableHead className="text-center text-sm font-semibold text-[#6B7280] py-4 bg-white">App B</TableHead>
                                <TableHead className="text-center text-sm font-semibold text-[#6B7280] py-4 bg-white">App C</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="space-y-2">
                            {[
                                { metric: "Feature Used", my: 12, a: 18, b: 15, c: 20, bad: true },
                                { metric: "Avg time on platform", my: "45m", a: "32m", b: "38m", c: "28m", good: true },
                                { metric: "Failed Tx %", my: "8.5%", a: "4.2%", b: "5.8%", c: "3.9%", bad: true },
                                { metric: "Avg Gas Pid", my: "$12.40", a: "$8.20", b: "$9.50", c: "$7.80", bad: true },
                                { metric: "Success Rate", my: "91.5%", a: "95.8%", b: "94.2%", c: "96.1%", bad: true },
                            ].map((row, i) => (
                                <TableRow key={i} className="border-none hover:bg-transparent">
                                    <TableCell className="text-sm text-[#4B5563] font-medium bg-white rounded-l-xl py-4 border-y border-l border-gray-50">{row.metric}</TableCell>
                                    <TableCell className="text-center bg-white py-4 border-y border-gray-50">
                                        <span className={`text-sm font-bold ${row.bad ? "text-[#EF4444]" : row.good ? "text-[#10B981]" : ""}`}>
                                            {row.my} <span className="text-[10px] ml-1">{row.bad ? "↘" : row.good ? "↗" : ""}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-[#6B7280] bg-white py-4 border-y border-gray-50">{row.a}</TableCell>
                                    <TableCell className="text-center text-sm text-[#6B7280] bg-white py-4 border-y border-gray-50">{row.b}</TableCell>
                                    <TableCell className="text-center text-sm text-[#6B7280] bg-white rounded-r-xl py-4 border-y border-r border-gray-50">{row.c}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
