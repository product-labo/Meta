"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { MetaGaugeLogo } from "@/components/icons/metagauge-logo"
import { Input } from "@/components/ui/input"
import { Search, LayoutDashboard, Bookmark, GitCompare, TrendingUp, FolderPlus, FileCode, LogOut, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/dashboard/compare", label: "Compared Project", icon: GitCompare },
  { href: "/dashboard/top", label: "Top/Failing Project", icon: TrendingUp },
  { href: "/dashboard/new", label: "New Project", icon: FolderPlus },
  { href: "/dashboard/api", label: "API & Export", icon: FileCode },
  { href: "/settings", label: "Settings", icon: Settings },
]

const chains = [
  { id: "ethereum", label: "Ethereum", color: "bg-blue-500" },
  { id: "polygon", label: "Polygon", color: "bg-purple-500" },
  { id: "starknet", label: "Starknet", color: "bg-teal-500" },
]

const categories = [
  { id: "dex", label: "DEX", icon: "⚡" },
  { id: "nft", label: "NFT", icon: "🎨" },
  { id: "dao", label: "DAO", icon: "🏛️" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [growthRange, setGrowthRange] = useState([50])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])



  return (
    <aside className="w-64 border-r bg-card h-screen flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <MetaGaugeLogo className="h-5 w-7" />
          <span className="font-semibold">MetaGauge</span>
        </Link>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Type a command or search..." className="pl-9 text-sm" />
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <h3 className="px-3 text-sm font-medium mb-2">Filtre By</h3>

          <div className="px-3 mb-4">
            <h4 className="text-sm font-medium mb-2">Chain</h4>
            <ul className="space-y-2">
              {chains.map((chain) => (
                <li key={chain.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={cn("w-4 h-4 rounded-full", chain.color)} />
                  {chain.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-3 mb-4">
            <h4 className="text-sm font-medium mb-2">Category</h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{cat.icon}</span>
                  {cat.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-3 mb-4">
            <h4 className="text-sm font-medium mb-4">Growth Score range</h4>
            <Slider value={growthRange} onValueChange={setGrowthRange} max={100} step={1} className="mb-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>100</span>
            </div>
          </div>


        </div>
      </nav>
    </aside>
  )
}
