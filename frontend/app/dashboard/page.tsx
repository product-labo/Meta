"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/ui/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Activity, Plus, Globe, Users, DollarSign, Zap, RefreshCw, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

// Import analyzer components for detailed metrics display
import { OverviewTab } from "@/components/analyzer/overview-tab"
import { MetricsTab } from "@/components/analyzer/metrics-tab"
import { UsersTab } from "@/components/analyzer/users-tab"
import { TransactionsTab } from "@/components/analyzer/transactions-tab"
import { UxTab } from "@/components/analyzer/ux-tab"

// Import marathon sync hook and animated logo components
import { useMarathonSync } from "@/hooks/use-marathon-sync"
import { MarathonSyncLoader, LoadingWithLogo } from "@/components/ui/animated-logo"

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
    continuousSync?: boolean
    continuousSyncStarted?: string
    continuousSyncStopped?: string
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
    syncCyclesCompleted?: number
    dataFreshness?: string
    accumulatedBlockRange?: number
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
  const [activeTab, setActiveTab] = useState('overview')
  const [quickSyncLoading, setQuickSyncLoading] = useState(false)
  const [quickSyncProgress, setQuickSyncProgress] = useState(0)

  // Use marathon sync hook for state management
  const {
    syncState,
    startMarathonSync,
    stopMarathonSync,
    refreshSyncState,
    isLoading: marathonLoading
  } = useMarathonSync()

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

  const handleQuickSync = async () => {
    try {
      setError(null)
      setQuickSyncLoading(true)
      setQuickSyncProgress(10)
      
      console.log('🚀 Starting quick sync...')
      const response = await api.onboarding.refreshDefaultContract(false)
      console.log('Quick sync started:', response)
      
      setQuickSyncProgress(30)
      
      // Monitor quick sync progress
      const monitorProgress = async () => {
        let attempts = 0
        const maxAttempts = 20 // 2 minutes max
        let lastProgress = 30
        let stuckCount = 0
        const MAX_STUCK_ATTEMPTS = 3 // If progress doesn't change for 3 attempts, consider it stuck
        
        while (attempts < maxAttempts && quickSyncLoading) {
          await new Promise(resolve => setTimeout(resolve, 6000)) // Wait 6 seconds
          attempts++
          
          try {
            const contractData = await api.onboarding.getDefaultContract()
            const analysisHistory = contractData.analysisHistory
            const indexingStatus = contractData.indexingStatus
            
            // Get actual progress from backend
            const actualProgress = indexingStatus?.progress || 0
            
            if (analysisHistory?.latest?.status === 'completed') {
              console.log('✅ Quick sync completed!')
              setQuickSyncProgress(100)
              
              // Reload data and refresh page after completion
              setTimeout(async () => {
                await Promise.all([
                  loadDefaultContractData(),
                  loadUserMetrics()
                ])
                setQuickSyncLoading(false)
                setQuickSyncProgress(0)
                
                // Trigger page refresh to show updated data
                console.log('🔄 Quick sync completed, refreshing page...')
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }, 2000)
              
              break
            } else if (analysisHistory?.latest?.status === 'running') {
              // Use actual progress from backend instead of fake progress
              const currentProgress = Math.max(30, Math.min(90, actualProgress))
              setQuickSyncProgress(currentProgress)
              console.log(`🔄 Quick sync progress: ${currentProgress}% (actual: ${actualProgress}%)`)
              
              // Detect if progress is stuck
              if (currentProgress === lastProgress) {
                stuckCount++
                console.log(`⚠️  Progress unchanged for ${stuckCount} attempts`)
                
                if (stuckCount >= MAX_STUCK_ATTEMPTS) {
                  console.log('🚨 Quick sync appears to be stuck')
                  throw new Error('Quick sync appears to be stuck. Please try again.')
                }
              } else {
                stuckCount = 0 // Reset stuck counter if progress changed
                lastProgress = currentProgress
              }
            } else if (analysisHistory?.latest?.status === 'failed') {
              console.log('❌ Quick sync failed')
              throw new Error('Quick sync analysis failed')
            } else {
              // Handle unexpected status
              console.log(`⚠️  Unexpected analysis status: ${analysisHistory?.latest?.status}`)
              
              // Check if we've been waiting too long
              if (attempts > 5) {
                throw new Error('Quick sync status unclear. Please refresh the page.')
              }
            }
          } catch (monitorError) {
            console.error('Error monitoring quick sync:', monitorError)
            throw monitorError // Re-throw to be caught by outer try-catch
          }
        }
        
        // If we exit the loop without completing, it's a timeout
        if (attempts >= maxAttempts && quickSyncLoading) {
          throw new Error('Quick sync timed out. Please try again.')
        }
      }
      
      // Start monitoring in background
      try {
        await monitorProgress()
      } catch (monitorError) {
        console.error('Quick sync monitoring failed:', monitorError)
        const errorMessage = monitorError instanceof Error ? monitorError.message : 'Quick sync monitoring failed'
        setError(errorMessage)
        setQuickSyncLoading(false)
        setQuickSyncProgress(0)
        return
      }
      
      // Wait a bit then reload data (removed the timeout reload since we handle it in monitoring)
      setTimeout(async () => {
        // Only reload data if sync is still running, completion will trigger page refresh
        if (!quickSyncLoading) return
        
        await Promise.all([
          loadDefaultContractData(),
          loadUserMetrics()
        ])
      }, 8000) // 8 seconds minimum loading time
      
    } catch (error: any) {
      console.error('Failed to start quick sync:', error)
      setError(error.message || 'Failed to start quick sync')
      setQuickSyncLoading(false)
      setQuickSyncProgress(0)
    }
  }

  const handleStopMarathonSync = useCallback(async () => {
    try {
      setError(null)
      await stopMarathonSync()
      
      // Auto-refresh the page after stopping sync
      console.log('🔄 Marathon sync stopped, refreshing page...')
      setTimeout(() => {
        window.location.reload()
      }, 1000) // 1 second delay to show the stop confirmation
      
    } catch (error: any) {
      console.error('Failed to stop marathon sync:', error)
      setError(error.message || 'Failed to stop marathon sync')
    }
  }, [stopMarathonSync])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <LoadingWithLogo 
            message="Loading your dashboard..." 
            size="lg"
            className="h-96"
          />
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
            Here's an overview of your business contract and analysis activity
          </p>
        </div>

        {/* Default Contract Section */}
        {defaultContract && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Dashboard</h2>
              <div className="flex items-center gap-2">
                {syncState.isActive ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopMarathonSync}
                    disabled={marathonLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${marathonLoading ? 'animate-spin' : ''}`} />
                    Stop Marathon Sync
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleQuickSync}
                      disabled={marathonLoading || quickSyncLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${quickSyncLoading ? 'animate-spin' : ''}`} />
                      {quickSyncLoading ? `Quick Sync ${quickSyncProgress}%` : 'Quick Sync'}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={startMarathonSync}
                      disabled={marathonLoading || quickSyncLoading}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Marathon Sync
                    </Button>
                  </>
                )}
                <Link href="/analyzer">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Analysis
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Contract Info Card - Full width when no sync active, 1/3 width when sync active */}
              <Card className={(syncState.isActive || quickSyncLoading) ? "lg:col-span-1" : "lg:col-span-3"}>
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
                  <div className={`space-y-2 text-sm ${(syncState.isActive || quickSyncLoading) ? '' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                    {/* Basic contract info */}
                    <div className="space-y-2">
                      <p><strong>Address:</strong> {defaultContract.contract.address.slice(0, 10)}...</p>
                      <p><strong>Purpose:</strong> {defaultContract.contract.purpose.slice(0, 100)}...</p>
                      <p><strong>Started:</strong> {formatDate(defaultContract.contract.startDate)}</p>
                    </div>
                    
                    {/* Status badges */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {syncState.isActive && (
                          <Badge variant="outline" className="animate-pulse">
                            Marathon Sync (Cycle {syncState.syncCycle})
                          </Badge>
                        )}
                        {quickSyncLoading && (
                          <Badge variant="outline" className="animate-pulse bg-blue-50 text-blue-700">
                            Quick Sync ({quickSyncProgress}%)
                          </Badge>
                        )}
                        {defaultContract.contract.continuousSync && !syncState.isActive && !quickSyncLoading && (
                          <Badge variant="default" className="bg-green-500">
                            Live Sync Active
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Marathon sync progress - only show when active */}
                    {syncState.isActive && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                          <span>Marathon Sync (Cycle {syncState.syncCycle})</span>
                          <div className="flex items-center gap-2">
                            <span>{syncState.progress}%</span>
                            {syncState.progress === 30 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setError(null)
                                    await refreshSyncState()
                                    
                                    // Also check backend status
                                    const status = await api.onboarding.getStatus()
                                    if (status.isIndexed && status.indexingProgress >= 100) {
                                      console.log('🔄 Backend shows completion, refreshing page...')
                                      setTimeout(() => {
                                        window.location.reload()
                                      }, 1000)
                                    }
                                  } catch (err: any) {
                                    setError('Failed to refresh sync status')
                                  }
                                }}
                                className="text-xs h-6 px-2"
                              >
                                Refresh
                              </Button>
                            )}
                          </div>
                        </div>
                        <Progress value={syncState.progress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {syncState.totalTransactions.toLocaleString()} transactions • {syncState.uniqueUsers.toLocaleString()} users
                          {syncState.cycleStartTime && (
                            <span> • Cycle started {new Date(syncState.cycleStartTime).toLocaleTimeString()}</span>
                          )}
                        </div>
                        {syncState.error && (
                          <div className="text-xs text-destructive">
                            {syncState.error}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Quick sync progress - only show when active */}
                    {quickSyncLoading && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                          <span>Quick Sync</span>
                          <div className="flex items-center gap-2">
                            <span>{quickSyncProgress}%</span>
                            {quickSyncProgress === 30 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setError(null)
                                    const status = await api.onboarding.getStatus()
                                    const contractData = await api.onboarding.getDefaultContract()
                                    
                                    // Update progress from backend
                                    const actualProgress = status.indexingProgress || 0
                                    setQuickSyncProgress(Math.max(30, actualProgress))
                                    
                                    // If backend shows completion, force completion
                                    if (status.isIndexed && actualProgress >= 100) {
                                      console.log('🔄 Backend shows completion, completing quick sync...')
                                      setQuickSyncProgress(100)
                                      setQuickSyncLoading(false)
                                      
                                      setTimeout(async () => {
                                        await Promise.all([
                                          loadDefaultContractData(),
                                          loadUserMetrics()
                                        ])
                                        window.location.reload()
                                      }, 1000)
                                    }
                                  } catch (err: any) {
                                    setError('Failed to refresh quick sync status')
                                  }
                                }}
                                className="text-xs h-6 px-2"
                              >
                                Refresh
                              </Button>
                            )}
                          </div>
                        </div>
                        <Progress value={quickSyncProgress} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          Refreshing contract data...
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Marathon Sync Loader - Only show when marathon sync is active, takes 2/3 width */}
              {syncState.isActive && (
                <div className="lg:col-span-2">
                  <MarathonSyncLoader
                    progress={syncState.progress}
                    cycle={syncState.syncCycle}
                    transactions={syncState.totalTransactions}
                    users={syncState.uniqueUsers}
                    cycleStartTime={syncState.cycleStartTime}
                    estimatedDuration={syncState.estimatedCycleDuration}
                    cyclesCompleted={syncState.cyclesCompleted}
                    onRefresh={async () => {
                      try {
                        setError(null)
                        await refreshSyncState()
                        
                        // Also check backend status
                        const status = await api.onboarding.getStatus()
                        if (status.isIndexed && status.indexingProgress >= 100) {
                          console.log('🔄 Backend shows completion, refreshing page...')
                          setTimeout(() => {
                            window.location.reload()
                          }, 1000)
                        }
                      } catch (err: any) {
                        setError('Failed to refresh marathon sync status')
                      }
                    }}
                    className="p-6 border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 h-full"
                  />
                </div>
              )}
              
              {/* Quick Sync Loader - Only show when quick sync is active, takes 2/3 width */}
              {quickSyncLoading && !syncState.isActive && (
                <div className="lg:col-span-2">
                  <div className="p-6 border rounded-lg bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 h-full">
                    <LoadingWithLogo 
                      message="Quick Sync in Progress" 
                      size="lg"
                      className="h-full"
                    />
                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span>Progress</span>
                        <div className="flex items-center gap-2">
                          <span>{quickSyncProgress}%</span>
                          {quickSyncProgress === 30 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  setError(null)
                                  const status = await api.onboarding.getStatus()
                                  const contractData = await api.onboarding.getDefaultContract()
                                  
                                  // Update progress from backend
                                  const actualProgress = status.indexingProgress || 0
                                  setQuickSyncProgress(Math.max(30, actualProgress))
                                  
                                  // If backend shows completion, force completion
                                  if (status.isIndexed && actualProgress >= 100) {
                                    console.log('🔄 Backend shows completion, completing quick sync...')
                                    setQuickSyncProgress(100)
                                    setQuickSyncLoading(false)
                                    
                                    setTimeout(async () => {
                                      await Promise.all([
                                        loadDefaultContractData(),
                                        loadUserMetrics()
                                      ])
                                      window.location.reload()
                                    }, 1000)
                                  }
                                } catch (err: any) {
                                  setError('Failed to refresh quick sync status')
                                }
                              }}
                              className="text-xs h-6 px-2"
                            >
                              Refresh
                            </Button>
                          )}
                        </div>
                      </div>
                      <Progress value={quickSyncProgress} className="h-2" />
                      <div className="text-center text-sm text-muted-foreground">
                        <p>Analyzing recent contract interactions...</p>
                        <p className="text-xs mt-1">This usually takes 30-60 seconds</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Summary - Only show when no sync is active */}
            {!syncState.isActive && !quickSyncLoading && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Show error message if analysis failed */}
                {defaultContract.analysisError && (
                  <div className="col-span-2 lg:col-span-4 mb-4">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleQuickSync}
                            disabled={marathonLoading || quickSyncLoading}
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${quickSyncLoading ? 'animate-spin' : ''}`} />
                            {quickSyncLoading ? `Retrying ${quickSyncProgress}%` : 'Retry Analysis'}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={startMarathonSync}
                            disabled={marathonLoading || quickSyncLoading}
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            Marathon Retry
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
 
              </div>
            )}

            {/* Detailed Metrics Tabs */}
            {defaultContract.indexingStatus.isIndexed && defaultContract.fullResults?.fullReport && (
              <div className="mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="ux">UX Analysis</TabsTrigger>
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

                  <TabsContent value="ux">
                    <UxTab 
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