"use client"

import { Button } from "@/components/ui/button"
import { Bell, User, AlertCircle, Info, Search, Plus, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DashboardHeader } from "@/components/dashboard/header"

export default function NotificationsPage() {
  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">

      <DashboardHeader
        title="Notification & Task Management"
        subtitle="Detailed insight per feature and per applications"
      />

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Real-Time Alerts</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 border rounded-xl bg-white shadow-sm flex gap-4 items-start">
            <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle className="w-5 h-5" /></div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold text-xs uppercase">Error</span>
              </div>
              <h4 className="font-medium">Feature Bridge errors exceeded threshold (12%)</h4>
              <p className="text-sm text-muted-foreground">Critical system event occurred 2 minutes ago immediate investigation required.</p>
              <div className="pt-2">
                <Button className="bg-slate-900 text-white text-xs h-8">Investigate</Button>
              </div>
            </div>
          </div>

          <div className="p-6 border rounded-xl bg-white shadow-sm flex gap-4 items-start">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600"><Info className="w-5 h-5" /></div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 font-bold text-xs uppercase">Info</span>
              </div>
              <h4 className="font-medium">Whale #x3F deposited $50K</h4>
              <p className="text-sm text-muted-foreground">Significant financial event detected. Target this user with the Stake promo</p>
              <div className="pt-2">
                <Button className="bg-slate-900 text-white text-xs h-8">Create Task</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 relative">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Task Center</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 gap-2">Status <Filter className="w-3 h-3" /></Button>
            <Button className="h-9 gap-2 bg-slate-900 text-white"><Plus className="w-3 h-3" /> Create New Task</Button>
          </div>
        </div>

        <div className="absolute top-0 left-32 w-64">
          {/* Search bar positioned next to title if needed, or just below */}
        </div>
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Type a command or search..." className="pl-9 h-10" />
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow>
                <TableHead className="font-medium text-xs text-muted-foreground">Task Name</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Due Date</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Impact</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground">Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Fix Feature Bridge Errors", status: "Overdue", date: "2024-07-20", impact: "500+ wallet", verify: "Reduce failures to <5%", red: true },
                { name: "Acquire 100 New Wallets (60/100)", status: "In Progress", date: "2024-07-20", impact: "High Revenue", verify: "Onboarding Checklist", yellow: true },
                { name: "Rotate API Keys for Q3", status: "Completed", date: "2024-06-30", impact: "Security", verify: "Confirmations logs", green: true },
                { name: "Rotate API Keys for Q3", status: "Completed", date: "2024-06-30", impact: "Security", verify: "Confirmations logs", green: true },
                { name: "Rotate API Keys for Q3", status: "Completed", date: "2024-06-30", impact: "Security", verify: "Confirmations logs", green: true },
                { name: "Fix Feature Bridge Errors", status: "Overdue", date: "2024-07-20", impact: "500+ wallet", verify: "Reduce failures to <5%", red: true },
                { name: "Rotate API Keys for Q3", status: "Completed", date: "2024-06-30", impact: "Security", verify: "Confirmations logs", green: true },
                { name: "Acquire 100 New Wallets (60/100)", status: "In Progress", date: "2024-07-20", impact: "High Revenue", verify: "Onboarding Checklist", yellow: true },
                { name: "Rotate API Keys for Q3", status: "Completed", date: "2024-06-30", impact: "Security", verify: "Confirmations logs", green: true },
                { name: "Fix Feature Bridge Errors", status: "Overdue", date: "2024-07-20", impact: "500+ wallet", verify: "Reduce failures to <5%", red: true },
              ].map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{item.name}
                    {item.yellow && <div className="h-1 bg-muted rounded-full mt-1 w-24 overflow-hidden"><div className="h-full bg-yellow-400 w-[60%]" /></div>}
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${item.red ? "bg-red-100 text-red-600" : item.yellow ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${item.red ? "bg-red-500" : item.yellow ? "bg-yellow-500" : "bg-green-500"}`} />
                      {item.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                  <TableCell className="text-sm text-foreground">{item.impact}</TableCell>
                  <TableCell className="text-sm text-foreground">{item.verify}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  )
}
