"use client"

import { useState, useEffect } from "react"
import { Bookmark, ChevronLeft, ChevronRight, Loader2, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"

export function ProjectsTable() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")

  useEffect(() => {
    // Basic debounce for search typing
    const timeoutId = setTimeout(() => fetchProjects(), 300);
    return () => clearTimeout(timeoutId);
  }, [page, search, category, sortBy])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 10, search, sortBy }
      if (category && category !== 'all') params.category = category;

      const res = await api.projects.list(params)

      if (res.success && res.data && res.data.businesses) {
        setProjects(res.data.businesses)
        // Backend doesn't return totalPages in this endpoint yet, simplifying for now
        setTotalPages(1)
      } else if (Array.isArray(res)) {
        setProjects(res)
      } else {
        setProjects([])
      }
    } catch (err) {
      console.error("Failed to fetch projects", err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleInteraction = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      router.push("/login?redirect=/dashboard")
      return false
    }
    return true
  }

  const handleRowClick = (e: React.MouseEvent, id: string) => {
    if (handleInteraction(e)) {
      router.push(`/projects/${id}`)
    }
  }

  return (
    <div className="space-y-4">

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30 p-4 rounded-lg border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2"><Filter className="h-4 w-4" /><SelectValue placeholder="Category" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="DeFi">DeFi</SelectItem>
              <SelectItem value="NFT">NFT</SelectItem>
              <SelectItem value="Identity">Identity</SelectItem>
              <SelectItem value="Bridge">Bridge</SelectItem>
              <SelectItem value="Infrastructure">Infrastructure</SelectItem>
              <SelectItem value="Privacy">Privacy</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customers">Customers</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="transactions">Transactions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground p-4">
              <th className="p-4 font-medium min-w-[200px]">BUSINESS</th>
              <th className="p-4 font-medium">CHAIN</th>
              <th className="p-4 font-medium">CUSTOMERS</th>
              <th className="p-4 font-medium">RETENTION</th>
              <th className="p-4 font-medium hidden md:table-cell">REVENUE</th>
              <th className="p-4 font-medium">HEALTH</th>
              <th className="p-4 font-medium">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
            ) : projects.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No projects found</td></tr>
            ) : projects.map((project) => (
              <tr
                key={project.contract_address}
                className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={(e) => handleRowClick(e, project.contract_address)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg">🚀</span>
                    </div>
                    <div>
                      <p className="font-medium">{project.business_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.contract_address.substring(0, 8)}...</p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded capitalize">{project.category}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="capitalize text-sm font-medium">{project.chain}</span>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{project.total_customers?.toLocaleString() || '0'}</span>
                    <span className="text-xs text-muted-foreground">({project.total_transactions} txs)</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{project.customer_retention_rate_percent ? `${project.customer_retention_rate_percent}%` : '0%'}</span>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <span className="text-sm">{project.total_revenue_eth ? `${project.total_revenue_eth.toFixed(4)} ETH` : '0 ETH'}</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs bg-green-100 text-green-700`}>
                    Active
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary p-0"
                      onClick={handleInteraction}
                    >
                      Details
                    </Button>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground p-2 hover:bg-muted rounded-full transition-colors"
                      onClick={handleInteraction}
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
