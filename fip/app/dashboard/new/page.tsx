"use client"

import { DashboardHeader } from "@/components/dashboard/header"
import { CheckCircle } from "lucide-react"

const newProjects = Array.from({ length: 13 }, () => ({
  name: "Uniswap VX3",
  category: "DEX Protocol",
  launched: "2 hour ago",
  volume: "$1.22M",
  volumeK: "$1.90K",
  auditStatus: "Audit Pending",
}))

export default function NewProjectPage() {
  return (
    <div className="p-6">
      <DashboardHeader title="New Project" subtitle="All project launched in the last 7 days" />

      <div className="mt-6 bg-card rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="text-sm text-muted-foreground border-b">
              <th className="text-left py-4 px-6 font-medium">Project Name</th>
              <th className="text-left py-4 px-6 font-medium">Launched</th>
              <th className="text-left py-4 px-6 font-medium">Category</th>
              <th className="text-left py-4 px-6 font-medium">Volume</th>
              <th className="text-left py-4 px-6 font-medium">Smart-Contract Audit</th>
            </tr>
          </thead>
          <tbody>
            {newProjects.map((project, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.category}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-muted-foreground">{project.launched}</td>
                <td className="py-4 px-6 text-sm">{project.volume}</td>
                <td className="py-4 px-6 text-sm">{project.volumeK}</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    {project.auditStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
