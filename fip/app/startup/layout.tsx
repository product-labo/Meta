import type React from "react"
import { StartupSidebar } from "@/components/startup/startup-sidebar"

export default function StartupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <StartupSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
