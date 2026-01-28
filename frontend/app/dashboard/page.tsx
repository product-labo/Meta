"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/ui/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Clock, TrendingUp, Activity, Plus, Eye, Globe, Users, DollarSign, Zap, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

// Import analyzer components for detailed metrics display
import { OverviewTab } from "@/components/analyzer/overview-tab"
import { MetricsTab } from "@/components/analyzer/metrics-tab"
import { UsersTab } from "@/components/analyzer/users-tab"
import { TransactionsTab } from "@/components/analyzer/transactions-tab"

interface DefaultContractData {
  contract: {
    address: string
    chain: string
    name: string
    category: string
    purpose: string
    startDate: string
    isIndexed: boolean
    indexingProgress: number
  }
  metrics: {
    tvl?: number
    volume?: number
    transactions?: number
    uniqueUsers?: number
    gasEfficiency?: number | string
    avgGasUsed?: number
    avgGasPrice?: number
    totalGasCost?: number
    failureRate?: number
    liquidityUtilization?: number
    apy?: number
    fees?: number
    activeUsers?: number
    newUsers?: number
    returningUsers?: number
    topUsers?: any[]
    recentTransactions?: any[]
  } | null
  fullResults: any | null // Full analysis results for detailed display
  indexingStatus: {
    isIndexed: boolean
    progress: number
  }
  analysisHistory: {
    total: number
    completed: number
    latest: {
      id: string
      status: string
      createdAt: string
      completedAt: string
      hasError?: boolean
    } | null
  }
  analysisError?: string | null // Error message if analysis failed
}

interface UserMetrics {
  overview: {
    totalContracts: number
    totalAnalyses: number
    completedAnalyses: number
    failedAnalyses: number
    runningAnalyses: number
    monthlyAnalyses: number
    chainsAnalyzed: string[]
    avgExecutionTimeMs: number
  }
  usage: {
    analysisCount: number
    monthlyAnalysisCount: number
    lastAnalysis: string | null
    monthlyResetDate: string
  }
  limits: {
    monthly: number
    remaining: number
  }
  recentAnalyses: Array<{
    id: string
    status: string
    analysisType: string
    contractAddress?: string
    contractName?: string
    chain?: string
    createdAt: string
    completedAt?: string
  }>
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [defaultContract, setDefaultContract] = useState<DefaultContractData | null>(null)
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (isAuthenticated) {
      checkOnboardingAndLoadData()
    }
  }, [isAuthenticated])

  const checkOnboardingAndLoadData = async () => {
    try {
      setLoading(true)
      
      // Check onboarding status first
      const onboardingStatus = await api.onboarding.getStatus()
      
      if (!onboardingStatus.completed) {
        router.push('/onboarding')
        return
      }

      // Load dashboard data
      await Promise.all([
        loadDefaultContractData(),
        loadUserMetrics()
      ])
      
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadDefaultContractData = async () => {
    try {
      const data = await api.onboarding.getDefaultContract()
      setDefaultContract(data)
    } catch (err) {
      console.error('Failed to load default contract data:', err)
    }
  }

  const loadUserMetrics = async () => {
    try {
      const data = await api.onboarding.getUserMetrics()
      setUserMetrics(data)
    } catch (err) {
      console.error('Failed to load user metrics:', err)
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

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleRefreshDefaultContract = async () => {
    try {
      setIsRefreshing(true)
      setRefreshProgress(0)
      setError(null)

      // Start the refresh
      const response = await api.onboarding.refreshDefaultContract()
      console.log('Refresh started:', response)

      // Monitor progress
      const monitorProgress = async () => {
        let attempts = 0
        const maxAttempts = 30 // 1 minute with 2-second intervals

        const checkProgress = async () => {
          try {
            const status = await api.onboarding.getStatus()
            setRefreshProgress(status.indexingProgress || 0)

            if (status.isIndexed && status.indexingProgress === 100) {
              // Refresh completed, reload data
              await Promise.all([
                loadDefaultContractData(),
                loadUserMetrics()
              ])
              setIsRefreshing(false)
              setRefreshProgress(100)
              return
            }

            attempts++
            if (attempts < maxAttempts) {
              setTimeout(checkProgress, 2000)
            } else {
              // Timeout, but still reload data
              await Promise.all([
                loadDefaultContractData(),
                loadUserMetrics()
              ])
              setIsRefreshing(false)
              setRefreshProgress(0)
            }
          } catch (error) {
            console.error('Progress check failed:', error)
            attempts++
            if (attempts < maxAttempts) {
              setTimeout(checkProgress, 2000)
            } else {
              setIsRefreshing(false)
              setRefreshProgress(0)
              setError('Failed to monitor refresh progress')
            }
          }
        }

        checkProgress()
      }

      monitorProgress()

    } catch (error: any) {
      console.error('Failed to refresh default contract:', error)
      setError(error.message || 'Failed to refresh contract data')
      setIsRefreshing(false)
      setRefreshProgress(0)
    }
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
            <p className="text-destructive">{error}</p>
            <Button onClick={checkOnboardingAndLoadData} className="mt-4">
              Retry
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Here's an overview of your default contract and analysis activity
          </p>
        </div>

        {/* Default Contract Section */}
        {defaultContract && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Your Default Contract</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshDefaultContract}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? `Syncing ${refreshProgress}%` : 'Sync Data'}
                </Button>
                <Link href="/analyzer">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Analysis
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Contract Info Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {defaultContract.contract.name}
                  </CardTitle>
                  <CardDescription>
                    {defaultContract.contract.category.toUpperCase()} • {defaultContract.contract.chain}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><strong>Address:</strong> {defaultContract.contract.address.slice(0, 10)}...</p>
                    <p><strong>Purpose:</strong> {defaultContract.contract.purpose.slice(0, 100)}...</p>
                    <p><strong>Started:</strong> {formatDate(defaultContract.contract.startDate)}</p>
                    <div className="flex items-center gap-2 mt-4">
                      {defaultContract.indexingStatus.isIndexed ? (
                        defaultContract.analysisError ? (
                          <Badge variant="destructive">Analysis Failed</Badge>
                        ) : (
                          <Badge variant="default">Indexed</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">
                          Indexing {defaultContract.indexingStatus.progress}%
                        </Badge>
                      )}
                      {isRefreshing && (
                        <Badge variant="outline" className="animate-pulse">
                          Refreshing...
                        </Badge>
                      )}
                    </div>
                    
                    {/* Refresh Progress Bar */}
                    {isRefreshing && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Syncing contract data</span>
                          <span>{refreshProgress}%</span>
                        </div>
                        <Progress value={refreshProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Metrics Summary */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                {/* Show error message if analysis failed */}
                {defaultContract.analysisError && (
                  <div className="col-span-2 mb-4">
                    <Card className="border-destructive/50 bg-destructive/5">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Analysis Error
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {defaultContract.analysisError}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshDefaultContract}
                          disabled={isRefreshing}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Retry Analysis
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      TVL
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {defaultContract.fullResults?.fullReport?.defiMetrics?.tvl ? 
                        formatCurrency(defaultContract.fullResults.fullReport.defiMetrics.tvl) : 
                        defaultContract.fullResults?.fullReport?.summary?.totalValue ?
                        formatCurrency(defaultContract.fullResults.fullReport.summary.totalValue) :
                        defaultContract.analysisError ? 'Error' : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {defaultContract.fullResults?.fullReport?.defiMetrics?.transactionVolume24h ? 
                        formatCurrency(defaultContract.fullResults.fullReport.defiMetrics.transactionVolume24h) : 
                        defaultContract.fullResults?.fullReport?.summary?.totalValue ?
                        formatCurrency(defaultContract.fullResults.fullReport.summary.totalValue) :
                        defaultContract.analysisError ? 'Error' : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {defaultContract.fullResults?.fullReport?.summary?.uniqueUsers ? 
                        formatNumber(defaultContract.fullResults.fullReport.summary.uniqueUsers) : 
                        defaultContract.analysisError ? 'Error' : 'N/A'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {defaultContract.fullResults?.fullReport?.summary?.totalTransactions ? 
                        formatNumber(defaultContract.fullResults.fullReport.summary.totalTransactions) : 
                        defaultContract.analysisError ? 'Error' : 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Detailed Metrics Tabs */}
            {defaultContract.indexingStatus.isIndexed && defaultContract.fullResults?.fullReport && (
              <div className="mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview">
                    <OverviewTab 
                      analysisResults={{
                        results: {
                          target: defaultContract.fullResults
                        }
                      }}
                      analysisId={defaultContract.analysisHistory.latest?.id}
                    />
                  </TabsContent>

                  <TabsContent value="metrics">
                    <MetricsTab 
                      analysisResults={{
                        results: {
                          target: defaultContract.fullResults
                        }
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="users">
                    <UsersTab 
                      analysisResults={{
                        results: {
                          target: defaultContract.fullResults
                        }
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="transactions">
                    <TransactionsTab 
                      analysisResults={{
                        results: {
                          target: defaultContract.fullResults
                        }
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}