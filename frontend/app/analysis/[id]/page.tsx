"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/ui/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, RefreshCw, Share, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

// Import dashboard components
import { DashboardHeader } from "@/components/analyzer/dashboard-header"
import { OverviewTab } from "@/components/analyzer/overview-tab"
import { MetricsTab } from "@/components/analyzer/metrics-tab"
import { UsersTab } from "@/components/analyzer/users-tab"
import { TransactionsTab } from "@/components/analyzer/transactions-tab"
import { CompetitiveTab } from "@/components/analyzer/competitive-tab"
import { UxTab } from "@/components/analyzer/ux-tab"

interface AnalysisResult {
  id: string
  status: string
  createdAt: string
  completedAt?: string
  contractAddress?: string
  analysisType: string
  duration?: number
  errorMessage?: string
  results?: {
    overview?: any
    metrics?: any
    transactions?: any
    users?: any
    competitive?: any
    aiInsights?: any
  }
}

export default function AnalysisResultPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardTab, setDashboardTab] = useState('overview')

  const analysisId = params.id as string

  useEffect(() => {
    if (isAuthenticated && analysisId) {
      loadAnalysis()
    }
  }, [isAuthenticated, analysisId])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First get the status
      const statusResponse = await api.analysis.getStatus(analysisId)
      
      if (statusResponse.status === 'completed') {
        // If completed, get the full results
        const resultsResponse = await api.analysis.getResults(analysisId)
        setAnalysis({
          ...statusResponse,
          results: resultsResponse
        })
      } else {
        // If not completed, just show status
        setAnalysis(statusResponse)
      }
    } catch (err) {
      console.error('Failed to load analysis:', err)
      setError('Failed to load analysis results')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAnalysis()
    setRefreshing(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
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
      month: 'long',
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

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">{error || 'Analysis not found'}</p>
            <div className="flex gap-2 justify-center mt-4">
              <Button onClick={loadAnalysis}>Try Again</Button>
              <Button variant="outline" asChild>
                <Link href="/history">Back to History</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Link>
          </Button>
        </div>

        {/* Analysis Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(analysis.status)}
                <div>
                  <CardTitle>Analysis Results</CardTitle>
                  <CardDescription>
                    ID: {analysis.id} • {analysis.analysisType} analysis
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                {analysis.status === 'completed' && (
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <div className="mt-1">
                  {getStatusBadge(analysis.status)}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium">Contract Address</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysis.contractAddress ? 
                    `${analysis.contractAddress.slice(0, 10)}...${analysis.contractAddress.slice(-8)}` :
                    'N/A'
                  }
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Started</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(analysis.createdAt)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDuration(analysis.duration)}
                </p>
              </div>
            </div>

            {analysis.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{analysis.errorMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {analysis.status === 'completed' && analysis.results ? (
          <div className="space-y-6">
            {/* Use the same dashboard header as analyzer page */}
            <DashboardHeader 
              startupName={analysis.contractAddress ? `Contract ${analysis.contractAddress.slice(0, 10)}...` : 'Analysis'} 
              chain={analysis.analysisType || 'unknown'} 
              analysisResults={analysis.results}
            />

            <Tabs value={dashboardTab} onValueChange={setDashboardTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="ux">UX Analysis</TabsTrigger>
                <TabsTrigger value="competitive">Competitive</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab analysisResults={analysis.results} analysisId={analysis.id || undefined} />
              </TabsContent>

              <TabsContent value="metrics">
                <MetricsTab analysisResults={analysis.results} />
              </TabsContent>

              <TabsContent value="users">
                <UsersTab analysisResults={analysis.results} />
              </TabsContent>

              <TabsContent value="transactions">
                <TransactionsTab analysisResults={analysis.results} />
              </TabsContent>

              <TabsContent value="ux">
                <UxTab analysisResults={analysis.results} />
              </TabsContent>

              <TabsContent value="competitive">
                <CompetitiveTab analysisResults={analysis.results} />
              </TabsContent>
            </Tabs>

            {/* Footer section for consistency */}
            <div className="mt-12 p-6 bg-card border rounded-lg text-center">
              <p className="text-muted-foreground text-sm">
                Generated by <span className="text-foreground font-semibold">MetaGauge</span> •{' '}
                <Button
                  onClick={() => {
                    // Create and download JSON file
                    const dataStr = JSON.stringify(analysis.results, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `analysis-${analysis.id}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Export JSON
                </Button>
              </p>
            </div>
          </div>
        ) : analysis.status === 'running' ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Analysis in Progress</h3>
                <p className="text-muted-foreground">
                  Your analysis is currently running. Results will appear here when complete.
                </p>
                <Button onClick={handleRefresh} className="mt-4">
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  Analysis results are not available for this status.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}