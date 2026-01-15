"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export function WalletTab() {
    return (
        <div className="space-y-10">
            <div>
                <h3 className="text-lg font-bold text-[#111827] mb-5">Active Wallet</h3>
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="hover:bg-transparent border-gray-100">
                                <TableHead className="py-4 px-6 text-sm font-semibold text-[#4B5563]">Wallet</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Features</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Time</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Gas Paid</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Inflow</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Outflow</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Revenue</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Success Tx</TableHead>
                                <TableHead className="py-4 text-sm font-semibold text-[#4B5563]">Failure Tx</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { w: "0x742d...a4f2", f: 12, t: "45m", g: "$12.40", i: "$2,490", o: "$890", r: "$1,450", s: 48, fl: 4 },
                                { w: "0x3e8c...b1d9", f: 8, t: "32m", g: "$8.90", i: "$2,200", o: "$450", r: "$750", s: 462, fl: 3 },
                                { w: "0x9a1f...c7e4", f: 15, t: "68m", g: "$18.90", i: "$5,600", o: "$2,100", r: "$3,500", s: 89, fl: 12 },
                                { w: "0xa84e...f8e6", f: 5, t: "22m", g: "$45.60", i: "$1,600", o: "$850", r: "$300", s: 152, fl: 6 },
                            ].map((row, i) => (
                                <TableRow key={i} className="border-gray-100 hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="py-4 px-6 text-sm text-[#6B7280] font-medium font-mono">{row.w}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#111827] font-medium">{row.f}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#6B7280]">{row.t}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#111827] font-semibold">{row.g}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#10B981] font-semibold">{row.i}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#F59E0B] font-semibold">{row.o}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#111827] font-semibold">{row.r}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#10B981] font-bold">{row.s}</TableCell>
                                    <TableCell className="py-4 text-sm text-[#EF4444] font-bold">{row.fl}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="text-sm text-[#4B5563] mb-3">Wallet Going Out</div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <div className="text-3xl font-bold text-[#F59E0B]">1,247</div>
                            <div className="text-sm font-semibold text-[#F59E0B]">↗ 18.2%</div>
                        </div>
                        <div className="text-xs text-[#9CA3AF]">tracking activity elsewhere</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="text-sm text-[#4B5563] mb-3">New Wallets Coming In</div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <div className="text-3xl font-bold text-[#10B981]">189</div>
                            <div className="text-sm font-semibold text-[#10B981]">↗ 12.4%</div>
                        </div>
                        <div className="text-xs text-[#9CA3AF]">from other apps</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm shadow-gray-200/50 rounded-2xl">
                    <CardContent className="p-6">
                        <div className="text-sm text-[#4B5563] mb-3">Dormant Wallets</div>
                        <div className="flex items-baseline gap-2 mb-2">
                            <div className="text-3xl font-bold text-[#F59E0B]">456</div>
                        </div>
                        <div className="text-xs text-[#9CA3AF]">No activity this month</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
