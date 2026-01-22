'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface IndexingProgressWidgetProps {
  walletId: string
  projectId: string
  className?: string
}

export interface IndexingProgress {
  status: 'queued' | 'indexing' | 'completed' | 'error'
  currentBlock: number
  totalBlocks: number
  startBlock: number
  endBlock: number
  transactionsFound: number
  eventsFound: number
  blocksPerSecond: number
  estimatedTimeRemaining: number // seconds
  errorMessage?: string
}

export function IndexingProgressWidget({ 
  walletId, 
  projectId, 
  className 
}: IndexingProgressWidgetProps) {
  const [progress, setProgress] = useState<IndexingProgress | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxRetries = 5
  const baseRetryDelay = 1000 // 1 second

  // Calculate progress percentage
  const progressPercentage = progress 
    ? progress.totalBlocks > 0 
      ? Math.min(100, Math.max(0, ((progress.currentBlock - progress.startBlock + 1) / progress.totalBlocks) * 100))
      : 0
    : 0

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus('connecting')
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/indexing/${walletId}`
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected for wallet:', walletId)
        setConnectionStatus('connected')
        setRetryCount(0)
        setIsRetrying(false)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'progress' && message.data.walletId === walletId) {
            const newProgress = message.data as IndexingProgress
            
            // Ensure monotonicity - current block should never decrease
            setProgress(prevProgress => {
              if (prevProgress && newProgress.currentBlock < prevProgress.currentBlock) {
                console.warn('Non-monotonic progress update detected, ignoring:', {
                  previous: prevProgress.currentBlock,
                  new: newProgress.currentBlock
                })
                return prevProgress
              }
              return newProgress
            })
          } else if (message.type === 'complete' && message.data.walletId === walletId) {
            setProgress(prev => prev ? { ...prev, status: 'completed' } : null)
          } else if (message.type === 'error' && message.data.walletId === walletId) {
            setProgress(prev => prev ? { 
              ...prev, 
              status: 'error', 
              errorMessage: message.data.errorMessage 
            } : null)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setConnectionStatus('disconnected')
        
        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && retryCount < maxRetries) {
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
  }, [walletId, retryCount])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (retryCount >= maxRetries) {
      setConnectionStatus('error')
      return
    }

    const delay = baseRetryDelay * Math.pow(2, retryCount)
    setIsRetrying(true)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setRetryCount(prev => prev + 1)
      connectWebSocket()
    }, delay)
  }, [retryCount, connectWebSocket])

  // Manual retry
  const handleRetry = useCallback(() => {
    setRetryCount(0)
    setIsRetrying(false)
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    connectWebSocket()
  }, [connectWebSocket])

  // Fetch initial status from API
  const fetchInitialStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/wallets/${walletId}/indexing-status`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success' && data.data) {
          setProgress(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch initial indexing status:', error)
    }
  }, [projectId, walletId])

  // Initialize component
  useEffect(() => {
    fetchInitialStatus()
    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting')
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [fetchInitialStatus, connectWebSocket])

  // Connection status indicator
  const ConnectionIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  // Status badge
  const getStatusBadge = () => {
    if (!progress) return <Badge variant="secondary">Loading...</Badge>
    
    switch (progress.status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>
      case 'indexing':
        return <Badge variant="default">Indexing</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <Card className={className} data-testid="progress-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Indexing Progress</CardTitle>
            <CardDescription>Real-time blockchain data indexing status</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <ConnectionIndicator />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {progress?.status === 'error' && progress.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {progress.errorMessage}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'error' && retryCount >= maxRetries && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connection failed after {maxRetries} attempts.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={handleRetry}
              >
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {progress && progress.status !== 'error' && (
          <>
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2"
                data-testid="progress-bar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Current Block</div>
                <div className="font-medium" data-testid="current-block">
                  {progress.currentBlock.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Blocks</div>
                <div className="font-medium" data-testid="total-blocks">
                  {progress.totalBlocks.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Transactions</div>
                <div className="font-medium" data-testid="transactions-found">
                  {progress.transactionsFound.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Events</div>
                <div className="font-medium" data-testid="events-found">
                  {progress.eventsFound.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Speed and ETA */}
            {progress.status === 'indexing' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Speed</div>
                  <div className="font-medium" data-testid="blocks-per-second">
                    {progress.blocksPerSecond.toFixed(1)} blocks/sec
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">ETA</div>
                  <div className="font-medium" data-testid="estimated-time">
                    {progress.estimatedTimeRemaining > 0 
                      ? formatTimeRemaining(progress.estimatedTimeRemaining)
                      : 'Calculating...'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Block Range */}
            <div className="text-xs text-muted-foreground">
              Indexing blocks {progress.startBlock.toLocaleString()} to {progress.endBlock.toLocaleString()}
            </div>
          </>
        )}

        {!progress && connectionStatus !== 'error' && (
          <div className="text-center py-4 text-muted-foreground">
            Loading indexing status...
          </div>
        )}
      </CardContent>
    </Card>
  )
}