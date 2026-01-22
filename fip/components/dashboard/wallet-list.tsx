'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, Plus, ExternalLink, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { IndexingErrorHandler } from './indexing-error-handler'

export interface WalletListProps {
  projectId: string
  onAddWallet?: () => void
  onWalletClick?: (walletId: string) => void
  className?: string
}

export interface WalletItem {
  id: string
  address: string
  chain: string
  chain_type: 'evm' | 'starknet'
  description?: string
  is_active: boolean
  last_indexed_block: number
  last_synced_at: string | null
  total_transactions: number
  total_events: number
  created_at: string
  updated_at: string
  indexingStatus: IndexingStatus
}

export interface IndexingStatus {
  state: 'synced' | 'indexing' | 'error' | 'queued' | 'ready' | 'running' | 'completed' | 'failed'
  currentBlock?: number
  startBlock?: number
  endBlock?: number
  transactionsFound?: number
  eventsFound?: number
  blocksPerSecond?: number
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  progress?: number
  message?: string
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

export function WalletList({ 
  projectId, 
  onAddWallet, 
  onWalletClick,
  className 
}: WalletListProps) {
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingWallets, setRefreshingWallets] = useState<Set<string>>(new Set())

  // Fetch wallets from API
  const fetchWallets = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/projects/${projectId}/wallets`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallets')
      }
      
      const data = await response.json()
      
      if (data.status === 'success') {
        setWallets(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch wallets')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Error fetching wallets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // Initial fetch
  useEffect(() => {
    fetchWallets()
  }, [fetchWallets])

  // Refresh specific wallet data
  const handleRefreshWallet = async (walletId: string) => {
    try {
      setRefreshingWallets(prev => new Set(prev).add(walletId))
      
      const response = await fetch(`/api/projects/${projectId}/wallets/${walletId}/refresh`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.data?.error || 'Failed to refresh wallet')
      }
      
      // Refresh the wallet list to show updated status
      await fetchWallets()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet'
      console.error('Error refreshing wallet:', err)
      alert(errorMessage)
    } finally {
      setRefreshingWallets(prev => {
        const next = new Set(prev)
        next.delete(walletId)
        return next
      })
    }
  }

  // Get status badge based on indexing state
  const getStatusBadge = (status: IndexingStatus) => {
    // Normalize status state
    const state = status.state?.toLowerCase()
    
    switch (state) {
      case 'queued':
        return <Badge variant="secondary" data-testid="status-badge-queued">Queued</Badge>
      case 'indexing':
      case 'running':
        return (
          <Badge variant="default" data-testid="status-badge-indexing">
            Indexing {status.progress ? `${Math.round(status.progress)}%` : ''}
          </Badge>
        )
      case 'completed':
      case 'synced':
        return <Badge variant="outline" className="text-green-600 border-green-600" data-testid="status-badge-synced">Synced</Badge>
      case 'error':
      case 'failed':
        return <Badge variant="destructive" data-testid="status-badge-error">Error</Badge>
      case 'ready':
      default:
        return <Badge variant="secondary" data-testid="status-badge-ready">Ready</Badge>
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

  // Truncate address for display
  const truncateAddress = (address: string): string => {
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={className} data-testid="wallet-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wallets</CardTitle>
              <CardDescription>Manage your project's wallet addresses</CardDescription>
            </div>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className} data-testid="wallet-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wallets</CardTitle>
              <CardDescription>Manage your project's wallet addresses</CardDescription>
            </div>
            <Button onClick={onAddWallet}>
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={fetchWallets}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (wallets.length === 0) {
    return (
      <Card className={className} data-testid="wallet-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Wallets</CardTitle>
              <CardDescription>Manage your project's wallet addresses</CardDescription>
            </div>
            <Button onClick={onAddWallet} data-testid="add-wallet-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              No wallets added yet. Add your first wallet to start indexing blockchain data.
            </div>
            <Button onClick={onAddWallet} data-testid="add-wallet-empty-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Wallet list table
  return (
    <Card className={className} data-testid="wallet-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Wallets</CardTitle>
            <CardDescription>
              {wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'} connected
            </CardDescription>
          </div>
          <Button onClick={onAddWallet} data-testid="add-wallet-button">
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Events</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wallets.map((wallet) => (
              <TableRow 
                key={wallet.id} 
                className="cursor-pointer hover:bg-muted/50"
                data-testid={`wallet-row-${wallet.id}`}
              >
                <TableCell 
                  onClick={() => onWalletClick?.(wallet.id)}
                  className="font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span title={wallet.address}>
                      {truncateAddress(wallet.address)}
                    </span>
                    {wallet.description && (
                      <span className="text-xs text-muted-foreground">
                        ({wallet.description})
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onWalletClick?.(wallet.id)}>
                  <Badge variant="outline">
                    {CHAIN_NAMES[wallet.chain] || wallet.chain}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => onWalletClick?.(wallet.id)}>
                  {getStatusBadge(wallet.indexingStatus)}
                </TableCell>
                <TableCell 
                  onClick={() => onWalletClick?.(wallet.id)}
                  className="text-muted-foreground"
                >
                  {formatTimestamp(wallet.last_synced_at)}
                </TableCell>
                <TableCell 
                  onClick={() => onWalletClick?.(wallet.id)}
                  className="text-right"
                  data-testid={`transaction-count-${wallet.id}`}
                >
                  {wallet.total_transactions.toLocaleString()}
                </TableCell>
                <TableCell 
                  onClick={() => onWalletClick?.(wallet.id)}
                  className="text-right"
                  data-testid={`event-count-${wallet.id}`}
                >
                  {wallet.total_events.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRefreshWallet(wallet.id)
                      }}
                      disabled={refreshingWallets.has(wallet.id)}
                      data-testid={`refresh-button-${wallet.id}`}
                      title="Refresh wallet data"
                    >
                      <RefreshCw 
                        className={`h-4 w-4 ${refreshingWallets.has(wallet.id) ? 'animate-spin' : ''}`} 
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onWalletClick?.(wallet.id)
                      }}
                      data-testid={`view-button-${wallet.id}`}
                      title="View wallet details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
