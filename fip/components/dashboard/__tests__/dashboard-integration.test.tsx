import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardSummary } from '../dashboard-summary'
import { WalletList } from '../wallet-list'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 100)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  send(data: string) {
    // Mock send method
  }
}

// Replace global WebSocket with mock
;(global as any).WebSocket = MockWebSocket

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock data
const mockAggregateStats = {
  totalWallets: 3,
  totalTransactions: 1250,
  totalEvents: 850,
  activeWallets: 3,
  uniqueChains: 2,
  mostRecentSync: '2024-01-15T10:30:00Z',
  statusSummary: {
    synced: 2,
    indexing: 1,
    queued: 0,
    error: 0,
    ready: 0
  },
  chainDistribution: [
    {
      chain: 'ethereum',
      chainType: 'evm',
      walletCount: 2,
      transactions: 800,
      events: 500
    },
    {
      chain: 'starknet-mainnet',
      chainType: 'starknet',
      walletCount: 1,
      transactions: 450,
      events: 350
    }
  ]
}

const mockWallets = [
  {
    id: 'wallet-1',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    chain: 'ethereum',
    chain_type: 'evm',
    description: 'Main wallet',
    is_active: true,
    last_indexed_block: 18500000,
    last_synced_at: '2024-01-15T10:30:00Z',
    total_transactions: 500,
    total_events: 300,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    indexingStatus: {
      state: 'synced',
      currentBlock: 18500000,
      startBlock: 18000000,
      endBlock: 18500000,
      transactionsFound: 500,
      eventsFound: 300,
      blocksPerSecond: 0,
      errorMessage: null,
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:30:00Z'
    }
  },
  {
    id: 'wallet-2',
    address: '0x8ba1f109551bD432803012645Hac136c22C57592',
    chain: 'ethereum',
    chain_type: 'evm',
    description: 'Secondary wallet',
    is_active: true,
    last_indexed_block: 18499500,
    last_synced_at: '2024-01-15T10:25:00Z',
    total_transactions: 300,
    total_events: 200,
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-15T10:25:00Z',
    indexingStatus: {
      state: 'indexing',
      currentBlock: 18499800,
      startBlock: 18499500,
      endBlock: 18500000,
      transactionsFound: 25,
      eventsFound: 15,
      blocksPerSecond: 2.5,
      errorMessage: null,
      startedAt: '2024-01-15T10:20:00Z',
      completedAt: null,
      progress: 60
    }
  },
  {
    id: 'wallet-3',
    address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    chain: 'starknet-mainnet',
    chain_type: 'starknet',
    description: 'Starknet wallet',
    is_active: true,
    last_indexed_block: 450000,
    last_synced_at: '2024-01-15T10:20:00Z',
    total_transactions: 450,
    total_events: 350,
    created_at: '2024-01-11T11:00:00Z',
    updated_at: '2024-01-15T10:20:00Z',
    indexingStatus: {
      state: 'synced',
      currentBlock: 450000,
      startBlock: 440000,
      endBlock: 450000,
      transactionsFound: 450,
      eventsFound: 350,
      blocksPerSecond: 0,
      errorMessage: null,
      startedAt: '2024-01-15T09:50:00Z',
      completedAt: '2024-01-15T10:20:00Z'
    }
  }
]

describe('Dashboard Integration Tests', () => {
  const defaultProps = {
    projectId: 'test-project-123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    MockWebSocket.instances = []
    mockFetch.mockClear()
  })

  afterEach(() => {
    // Clean up any open WebSocket connections
    MockWebSocket.instances.forEach(ws => {
      if (ws.readyState === MockWebSocket.OPEN) {
        ws.close()
      }
    })
  })

  describe('Dashboard displays correct wallet statuses', () => {
    it('should display aggregate statistics correctly', async () => {
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('total-wallets-count')).toHaveTextContent('3')
      })

      // Check all summary cards
      expect(screen.getByTestId('total-transactions-count')).toHaveTextContent('1.3K')
      expect(screen.getByTestId('total-events-count')).toHaveTextContent('850')
      
      // Check status badges
      expect(screen.getByText('2 synced')).toBeInTheDocument()
      expect(screen.getByText('1 indexing')).toBeInTheDocument()

      // Check chain distribution
      expect(screen.getByTestId('chain-ethereum')).toBeInTheDocument()
      expect(screen.getByTestId('chain-starknet-mainnet')).toBeInTheDocument()
    })

    it('should display wallet list with correct statuses', async () => {
      // Mock API response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockWallets
          })
        })

      render(<WalletList {...defaultProps} />)

      // Wait for wallets to load
      await waitFor(() => {
        expect(screen.getByTestId('wallet-row-wallet-1')).toBeInTheDocument()
      })

      // Check wallet statuses - use getAllBy since there are multiple synced wallets
      expect(screen.getAllByTestId('status-badge-synced')).toHaveLength(2)
      expect(screen.getByTestId('status-badge-indexing')).toBeInTheDocument()

      // Check transaction and event counts
      expect(screen.getByTestId('transaction-count-wallet-1')).toHaveTextContent('500')
      expect(screen.getByTestId('event-count-wallet-1')).toHaveTextContent('300')
      expect(screen.getByTestId('transaction-count-wallet-2')).toHaveTextContent('300')
      expect(screen.getByTestId('event-count-wallet-2')).toHaveTextContent('200')
    })

    it('should show correct status badges for different wallet states', async () => {
      const walletsWithDifferentStates = [
        {
          ...mockWallets[0],
          indexingStatus: { ...mockWallets[0].indexingStatus, state: 'synced' }
        },
        {
          ...mockWallets[1],
          indexingStatus: { ...mockWallets[1].indexingStatus, state: 'indexing' }
        },
        {
          ...mockWallets[2],
          id: 'wallet-4',
          indexingStatus: { ...mockWallets[2].indexingStatus, state: 'error', errorMessage: 'RPC connection failed' }
        }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: walletsWithDifferentStates
          })
        })

      render(<WalletList {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('status-badge-synced')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-indexing')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-error')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time updates', () => {
    it('should establish WebSocket connection for real-time stats updates', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
        const ws = MockWebSocket.instances[0]
        expect(ws.url).toContain(`/ws/project/${defaultProps.projectId}/stats`)
      })
    })

    it('should update stats when receiving WebSocket messages', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      // Wait for initial load and WebSocket connection
      await waitFor(() => {
        expect(screen.getByTestId('total-transactions-count')).toHaveTextContent('1.3K')
        expect(MockWebSocket.instances).toHaveLength(1)
      })

      // Wait for WebSocket to be connected
      await waitFor(() => {
        const ws = MockWebSocket.instances[0]
        expect(ws.readyState).toBe(MockWebSocket.OPEN)
      })

      // Simulate WebSocket message with updated stats
      const updatedStats = {
        ...mockAggregateStats,
        totalTransactions: 1500,
        statusSummary: {
          ...mockAggregateStats.statusSummary,
          synced: 3,
          indexing: 0
        }
      }

      const ws = MockWebSocket.instances[0]
      
      act(() => {
        ws.simulateMessage({
          type: 'stats_update',
          data: updatedStats
        })
      })

      // Check that stats were updated
      await waitFor(() => {
        expect(screen.getByTestId('total-transactions-count')).toHaveTextContent('1.5K')
        expect(screen.getByText('3 synced')).toBeInTheDocument()
        expect(screen.queryByText('1 indexing')).not.toBeInTheDocument()
      })
    })

    it('should show connection status indicator', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      // Initially should show disconnected state
      await waitFor(() => {
        expect(screen.getByTitle('Real-time updates disconnected')).toBeInTheDocument()
      })

      // After WebSocket connects, should show connected state
      await waitFor(() => {
        expect(screen.getByTitle('Real-time updates active')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Quick actions functionality', () => {
    it('should handle refresh all wallets action', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: {
              summary: {
                totalWallets: 3,
                queued: 3,
                skipped: 0,
                errors: 0
              },
              results: [
                { walletId: 'wallet-1', status: 'queued', jobId: 'job-1' },
                { walletId: 'wallet-2', status: 'queued', jobId: 'job-2' },
                { walletId: 'wallet-3', status: 'queued', jobId: 'job-3' }
              ]
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('refresh-all-button')).toBeInTheDocument()
      })

      // Click refresh all button
      fireEvent.click(screen.getByTestId('refresh-all-button'))

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByTestId('refresh-all-button')).toBeDisabled()
      })

      // Verify API calls
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/projects/${defaultProps.projectId}/wallets/refresh-all`,
          { method: 'POST' }
        )
      })
    })

    it('should call onAddWallet when add wallet button is clicked', async () => {
      const mockOnAddWallet = jest.fn()

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} onAddWallet={mockOnAddWallet} />)

      await waitFor(() => {
        expect(screen.getByTestId('add-wallet-button')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('add-wallet-button'))

      expect(mockOnAddWallet).toHaveBeenCalledTimes(1)
    })

    it('should disable refresh all button when no wallets exist', async () => {
      const emptyStats = {
        ...mockAggregateStats,
        totalWallets: 0,
        activeWallets: 0
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: emptyStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('refresh-all-button')).toBeDisabled()
      })
    })
  })

  describe('Error handling', () => {
    it('should display error message when stats fetch fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))

      render(<DashboardSummary {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should retry fetching stats when retry button is clicked', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'success',
            data: mockAggregateStats
          })
        })

      render(<DashboardSummary {...defaultProps} />)

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Click retry
      fireEvent.click(screen.getByText('Retry'))

      // Should load successfully
      await waitFor(() => {
        expect(screen.getByTestId('total-wallets-count')).toHaveTextContent('3')
      })
    })
  })
})