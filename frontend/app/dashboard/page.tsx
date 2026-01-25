"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/ui/header"
import { BarChart3, Clock, TrendingUp, Activity, Plus, Eye } from "lucide-react"
import Link from "next/link"

interface DashboardData {
  recentAnalyses: Array<{
    id: string
    status: string
    createdAt: string
    contractAddress?: string
    analysisType: string
  }>
  stats: {
    totalAnalyses: number
    completedAnalyses: number
    failedAnalyses: number
    avgAnalysisTime: number
  }
  usage: {
    analysesThisMonth: number
    analysesLimit: number
    planType: string
  }
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData()
    }
  }, [isAuthenticated])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [dashboardResponse, usageResponse] = await Promise.all([
        api.users.getDashboard(),
        api.users.getUsage()
      ])
      
      setDashboardData({
        recentAnalyses: dashboardResponse.recentAnalyses || [],
        stats: dashboardResponse.stats || {
          totalAnalyses: 0,
          completedAnalyses: 0,
          failedAnalyses: 0,
          avgAnalysisTime: 0
        },
        usage: usageResponse
      })
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            <Button onClick={loadDashboardData} className="mt-4">
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
          <h1 className="text-3xl font-bold">Welcome back, {user?.email?.split('@')[0]}</h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your contract analysis activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.stats.totalAnalyses || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.stats.completedAnalyses || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.usage.analysesThisMonth || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {dashboardData?.usage.analysesLimit || 'unlimited'} limit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData?.stats.avgAnalysisTime ? `${Math.round(dashboardData.stats.avgAnalysisTime)}s` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Analyses</CardTitle>
              <CardDescription>Your latest contract analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData?.recentAnalyses.length ? (
                <div className="space-y-4">
                  {dashboardData.recentAnalyses.slice(0, 5).map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(analysis.status)}
                          <span className="text-sm text-muted-foreground">
                            {analysis.analysisType}
                          </span>
                        </div>
                        <p className="text-sm font-medium">
                          {analysis.contractAddress ? 
                            `${analysis.contractAddress.slice(0, 8)}...${analysis.contractAddress.slice(-6)}` :
                            'Contract Analysis'
                          }
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/analysis/${analysis.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No analyses yet</p>
                  <Button asChild>
                    <Link href="/analyzer">
                      <Plus className="h-4 w-4 mr-2" />
                      Start Your First Analysis
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/analyzer">
                  <Plus className="h-4 w-4 mr-2" />
                  New Analysis
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/history">
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/profile">
                  <Activity className="h-4 w-4 mr-2" />
                  Account Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}