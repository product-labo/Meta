'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Plus, Activity, Database, Wallet, TrendingUp, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export interface DashboardSummaryProps {
  projectId: string
  onAddWallet?: () => void
  onRefreshAll?: () => void
  className?: string
}

export interface AggregateStats {
  totalWallets: number
  totalTransactions: number
  totalEvents: number
  activeWallets: number
  uniqueChains: number
  mostRecentSync: string | null
  statusSummary: {
    synced: number
    indexing: number
    queued: number
    error: number
    ready: number
  }
  chainDistribution: Array<{
    chain: string
    chainType: string
    walletCount: number
    transactions: number
    events: number
  }>
}

// Chain display names
const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  lisk: 'Lisk',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  bsc: 'BNB Chain',
  'starknet-mainnet': 'Starknet',
  'starknet-sepolia': 'Starknet Sepolia'
}

export function DashboardSummary({ 
  projectId, 
  onAddWallet, 
  onRefreshAll,
  className 
}: DashboardSummaryProps) {
  const [stats, setStats] = useState<AggregateStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true)
  
  // Real-time update state
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 5

  // Fetch aggregate statistics
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}/wallets/stats`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics')
      }
      
      const data = await response.json()
      
      if (data.status === 'success') {
        setStats(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch statistics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Error fetching stats:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Connect to WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!isRealTimeEnabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/project/${projectId}/stats`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected for project stats:', projectId)
        setConnectionStatus('connected')
        setRetryCount(0)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'stats_update') {
            // Update stats with real-time data
            setStats(data.data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setConnectionStatus('disconnected')
        
        if (retryCount < maxRetries && isRealTimeEnabled) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
        scheduleReconnect()
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus('error')
      scheduleReconnect()
    }
  }, [projectId, retryCount, isRealTimeEnabled])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (retryCount >= maxRetries || !isRealTimeEnabled) {
      return
    }

    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) // Max 30 seconds
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1)
      connectWebSocket()
    }, delay)
  }, [retryCount, connectWebSocket, isRealTimeEnabled])

  // Initial fetch
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // WebSocket connection management
  useEffect(() => {
    if (isRealTimeEnabled) {
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connectWebSocket, isRealTimeEnabled])

  // Handle refresh all wallets
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true)
      
      const response = await fetch(`/api/projects/${projectId}/wallets/refresh-all`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.data?.error || 'Failed to refresh wallets')
      }
      
      const result = await response.json()
      
      // Show success message or handle result
      console.log('Refresh all result:', result.data)
      
      // Refresh stats after initiating refresh
      await fetchStats()
      
      // Call parent callback if provided
      onRefreshAll?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallets'
      console.error('Error refreshing all wallets:', err)
      alert(errorMessage)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2"
            onClick={fetchStats}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // No stats available
  if (!stats) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">No statistics available</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Wallets */}
        <Card data-testid="total-wallets-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-wallets-count">
              {stats.totalWallets}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activeWallets} active • {stats.uniqueChains} chains
            </p>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card data-testid="total-transactions-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-transactions-count">
              {formatNumber(stats.totalTransactions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all wallets
            </p>
          </CardContent>
        </Card>

        {/* Total Events */}
        <Card data-testid="total-events-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="total-events-count">
              {formatNumber(stats.totalEvents)}
            </div>
            <p className="text-xs text-muted-foreground">
              Contract events indexed
            </p>
          </CardContent>
        </Card>

        {/* Indexing Status */}
        <Card data-testid="indexing-status-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <div title="Real-time updates active">
                  <Wifi className="h-4 w-4 text-green-600" />
                </div>
              ) : (
                <div title="Real-time updates disconnected">
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1 mb-2">
              {stats.statusSummary.synced > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                  {stats.statusSummary.synced} synced
                </Badge>
              )}
              {stats.statusSummary.indexing > 0 && (
                <Badge variant="default" className="text-xs">
                  {stats.statusSummary.indexing} indexing
                </Badge>
              )}
              {stats.statusSummary.queued > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {stats.statusSummary.queued} queued
                </Badge>
              )}
              {stats.statusSummary.error > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stats.statusSummary.error} error
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last sync: {formatTimestamp(stats.mostRecentSync)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your wallets and indexing</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshAll}
                disabled={isRefreshing || stats.totalWallets === 0}
                data-testid="refresh-all-button"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh All
              </Button>
              <Button onClick={onAddWallet} data-testid="add-wallet-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            </div>
          </div>
        </CardHeader>
        {stats.chainDistribution.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Chain Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.chainDistribution.map((chain) => (
                  <div 
                    key={chain.chain} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`chain-${chain.chain}`}
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {CHAIN_NAMES[chain.chain] || chain.chain}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {chain.walletCount} {chain.walletCount === 1 ? 'wallet' : 'wallets'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatNumber(chain.transactions)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(chain.events)} events
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}