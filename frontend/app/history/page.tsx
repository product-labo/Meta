"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/ui/header"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Search, Filter, Download, Calendar } from "lucide-react"
import Link from "next/link"

interface AnalysisHistory {
  id: string
  status: string
  createdAt: string
  completedAt?: string
  contractAddress?: string
  analysisType: string
  duration?: number
  errorMessage?: string
}

export default function HistoryPage() {
  const { isAuthenticated } = useAuth()
  const [analyses, setAnalyses] = useState<AnalysisHistory[]>([])
  const [filteredAnalyses, setFilteredAnalyses] = useState<AnalysisHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    if (isAuthenticated) {
      loadHistory()
    }
  }, [isAuthenticated])

  useEffect(() => {
    filterAnalyses()
  }, [analyses, searchTerm, statusFilter, typeFilter])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await api.analysis.getHistory()
      setAnalyses(response.analyses || [])
    } catch (err) {
      console.error('Failed to load analysis history:', err)
      setError('Failed to load analysis history')
    } finally {
      setLoading(false)
    }
  }

  const filterAnalyses = () => {
    let filtered = analyses

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(analysis => 
        analysis.contractAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(analysis => analysis.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(analysis => analysis.analysisType === typeFilter)
    }

    setFilteredAnalyses(filtered)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      running: "secondary", 
      failed: "destructive",
      pending: "outline"
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    if (duration < 60) return `${duration}s`
    return `${Math.floor(duration / 60)}m ${duration % 60}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadHistory} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analysis History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your contract analysis history
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by contract address or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="competitive">Competitive</SelectItem>
                  <SelectItem value="comparative">Comparative</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => {
                setSearchTerm("")
                setStatusFilter("all")
                setTypeFilter("all")
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  {filteredAnalyses.length} of {analyses.length} analyses
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAnalyses.length ? (
              <div className="space-y-4">
                {filteredAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(analysis.status)}
                        <Badge variant="outline">{analysis.analysisType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ID: {analysis.id.slice(0, 8)}...
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Contract:</span>
                          <p className="text-muted-foreground">
                            {analysis.contractAddress ? 
                              `${analysis.contractAddress.slice(0, 10)}...${analysis.contractAddress.slice(-8)}` :
                              'N/A'
                            }
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium">Started:</span>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(analysis.createdAt)}
                          </p>
                        </div>
                        
                        <div>
                          <span className="font-medium">Duration:</span>
                          <p className="text-muted-foreground">
                            {formatDuration(analysis.duration)}
                          </p>
                        </div>
                      </div>

                      {analysis.errorMessage && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          {analysis.errorMessage}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/analysis/${analysis.id}`}>
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {analyses.length === 0 ? 'No analyses found' : 'No analyses match your filters'}
                </p>
                {analyses.length === 0 && (
                  <Button asChild>
                    <Link href="/analyzer">Start Your First Analysis</Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}