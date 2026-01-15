"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardHeader } from "@/components/dashboard/header"
import { Copy, RefreshCw, Download, FileText, Code, Database, Search } from "lucide-react"

export default function ApiExportPage() {
  const [apiKey, setApiKey] = useState("MG_live_83hf73k9sl2903nslq")
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const exportHistory = [
    { id: 1, name: "User_Retention_Q4.csv", size: "1.2 MB", date: "2024-01-10", status: "Completed" },
    { id: 2, name: "Feature_Adoption_Monthly.json", size: "850 KB", date: "2024-01-08", status: "Completed" },
    { id: 3, name: "Benchmark_Report_Full.pdf", size: "4.5 MB", date: "2024-01-05", status: "Completed" },
    { id: 4, name: "Active_Wallets_Dump.csv", size: "12.8 MB", date: "2024-01-01", status: "Expired" },
  ]

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <DashboardHeader
        title="API & Export"
        subtitle="Manage your API keys and data export preferences"
      />

      <div className="space-y-8 max-w-6xl mx-auto">
        {/* API Key Management */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Code className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-[#111827]">API Key Management</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500 max-w-2xl">
              Use your API key to authenticate requests to the MetaGauge API. Keep it secure and never share it publicly.
            </p>

            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Your Secret Key</label>
                <div className="relative">
                  <Input
                    value={apiKey}
                    readOnly
                    className="h-12 bg-gray-50 border-gray-200 rounded-xl px-4 text-sm font-mono focus:ring-0"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 px-3 rounded-lg text-xs font-bold hover:bg-white"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      {isCopied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-lg text-xs font-bold hover:bg-white text-gray-400"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* API Usage Metrics */}
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Total Requests", value: "45.2k", trend: "+12.5%", icon: Search, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Error Rate", value: "0.02%", trend: "-0.5%", icon: RefreshCw, color: "text-red-600", bg: "bg-red-50" },
            { label: "Avg Latency", value: "124ms", trend: "-5ms", icon: Database, color: "text-green-600", bg: "bg-green-50" },
          ].map((item, i) => (
            <Card key={i} className="border-none shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 ${item.bg} rounded-xl`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {item.trend}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-400">{item.label}</p>
                  <p className="text-2xl font-bold text-[#111827]">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Export History */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-[#111827]">Export History</h2>
            </div>
            <Button className="h-10 px-6 bg-[#111827] text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors">
              New Export
            </Button>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                  <TableHead className="px-8 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">File Name</TableHead>
                  <TableHead className="px-8 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center">Size</TableHead>
                  <TableHead className="px-8 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center">Date</TableHead>
                  <TableHead className="px-8 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="px-8 py-4 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportHistory.map((item) => (
                  <TableRow key={item.id} className="border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <TableCell className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                          <Download className="w-4 h-4 text-gray-400" />
                        </div>
                        <span className="text-sm font-bold text-[#111827]">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-center">
                      <span className="text-sm text-gray-500 font-medium">{item.size}</span>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-center">
                      <span className="text-sm text-gray-500 font-medium">{item.date}</span>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${item.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-8 py-4 text-right">
                      <Button
                        disabled={item.status === 'Expired'}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:text-[#111827] text-gray-400"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
