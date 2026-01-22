import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletList, WalletItem } from '../wallet-list'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WalletList', () => {
  const defaultProps = {
    projectId: 'test-project-id',
  }

  const mockWallets: WalletItem[] = [
    {
      id: 'wallet-1',
      address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
      chain: 'ethereum',
      chain_type: 'evm',
      description: 'Main treasury wallet',
      is_active: true,
      last_indexed_block: 18500000,
      last_synced_at: '2024-01-15T10:30:00Z',
      total_transactions: 1250,
      total_events: 3400,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      indexingStatus: {
        state: 'synced',
        currentBlock: 18500000,
        startBlock: 18000000,
        endBlock: 18500000,
        transactionsFound: 1250,
        eventsFound: 3400,
        blocksPerSecond: 2.5,
        completedAt: '2024-01-15T10:30:00Z'
      }
    },
    {
      id: 'wallet-2',
      address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      chain: 'starknet-mainnet',
      chain_type: 'starknet',
      description: 'DEX contract',
      is_active: true,
      last_indexed_block: 450000,
      last_synced_at: null,
      total_transactions: 0,
      total_events: 0,
      created_at: '2024-01-16T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      indexingStatus: {
        state: 'indexing',
        currentBlock: 425000,
        startBlock: 400000,
        endBlock: 450000,
        transactionsFound: 0,
        eventsFound: 0,
        blocksPerSecond: 1.8,
        progress: 50,
        startedAt: '2024-01-16T09:00:00Z'
      }
    },
    {
      id: 'wallet-3',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chain: 'polygon',
      chain_type: 'evm',
      is_active: true,
      last_indexed_block: 0,
      last_synced_at: null,
      total_transactions: 0,
      total_events: 0,
      created_at: '2024-01-17T00:00:00Z',
      updated_at: '2024-01-17T00:00:00Z',
      indexingStatus: {
        state: 'error',
        errorMessage: 'RPC connection failed',
        startedAt: '2024-01-17T08:00:00Z'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render wallet list with loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      render(<WalletList {...defaultProps} />)
      
      expect(screen.getByTestId('wallet-list')).toBeInTheDocument()
      expect(screen.getByText('Wallets')).toBeInTheDocument()
      expect(screen.getByText('Manage your project\'s wallet addresses')).toBeInTheDocument()
      
      // Should show loading skeletons
      expect(screen.getByText('Add Wallet')).toBeDisabled()
    })

    it('should render empty state when no wallets exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: [] })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('No wallets added yet. Add your first wallet to start indexing blockchain data.')).toBeInTheDocument()
        expect(screen.getByTestId('add-wallet-empty-button')).toBeInTheDocument()
      })
    })

    it('should render wallet list with data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('3 wallets connected')).toBeInTheDocument()
        
        // Check wallet rows are rendered
        expect(screen.getByTestId('wallet-row-wallet-1')).toBeInTheDocument()
        expect(screen.getByTestId('wallet-row-wallet-2')).toBeInTheDocument()
        expect(screen.getByTestId('wallet-row-wallet-3')).toBeInTheDocument()
      })
    })

    it('should render error state when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })
  })

  describe('Wallet Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
    })

    it('should display wallet addresses correctly', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        // Should truncate long addresses
        expect(screen.getByText('0x742d35...f0beb0')).toBeInTheDocument()
        expect(screen.getByText('0x049d36...004dc7')).toBeInTheDocument()
        expect(screen.getByText('0x123456...345678')).toBeInTheDocument()
      })
    })

    it('should display wallet descriptions when available', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('(Main treasury wallet)')).toBeInTheDocument()
        expect(screen.getByText('(DEX contract)')).toBeInTheDocument()
      })
    })

    it('should display chain names correctly', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Ethereum')).toBeInTheDocument()
        expect(screen.getByText('Starknet')).toBeInTheDocument()
        expect(screen.getByText('Polygon')).toBeInTheDocument()
      })
    })

    it('should display transaction and event counts', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('transaction-count-wallet-1')).toHaveTextContent('1,250')
        expect(screen.getByTestId('event-count-wallet-1')).toHaveTextContent('3,400')
        expect(screen.getByTestId('transaction-count-wallet-2')).toHaveTextContent('0')
        expect(screen.getByTestId('event-count-wallet-2')).toHaveTextContent('0')
      })
    })

    it('should format timestamps correctly', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        // Should show relative time for recent syncs
        const syncedWallet = screen.getByTestId('wallet-row-wallet-1')
        expect(syncedWallet).toBeInTheDocument()
        
        // Should show "Never" for wallets that haven't synced
        const unSyncedWallet = screen.getByTestId('wallet-row-wallet-2')
        expect(unSyncedWallet).toBeInTheDocument()
      })
    })
  })

  describe('Status Badge Rendering', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
    })

    it('should render synced status badge correctly', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('status-badge-synced')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-synced')).toHaveTextContent('Synced')
      })
    })

    it('should render indexing status badge with progress', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('status-badge-indexing')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-indexing')).toHaveTextContent('Indexing 50%')
      })
    })

    it('should render error status badge correctly', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('status-badge-error')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-error')).toHaveTextContent('Error')
      })
    })
  })

  describe('Refresh Button Functionality', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
    })

    it('should call refresh API when refresh button is clicked', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('refresh-button-wallet-1')).toBeInTheDocument()
      })
      
      // Mock refresh API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { indexingJobId: 'job-123' } })
      })
      
      const refreshButton = screen.getByTestId('refresh-button-wallet-1')
      fireEvent.click(refreshButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/projects/${defaultProps.projectId}/wallets/wallet-1/refresh`,
          { method: 'POST' }
        )
      })
    })

    it('should show loading state while refreshing', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('refresh-button-wallet-1')).toBeInTheDocument()
      })
      
      // Mock slow refresh API response
      mockFetch.mockImplementation((url) => {
        if (url.includes('/refresh')) {
          return new Promise(resolve => {
            setTimeout(() => resolve({
              ok: true,
              json: async () => ({ status: 'success', data: { indexingJobId: 'job-123' } })
            }), 100)
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ status: 'success', data: mockWallets })
        })
      })
      
      const refreshButton = screen.getByTestId('refresh-button-wallet-1')
      fireEvent.click(refreshButton)
      
      // Should show spinning icon
      await waitFor(() => {
        const icon = refreshButton.querySelector('.animate-spin')
        expect(icon).toBeInTheDocument()
      })
    })

    it('should handle refresh API errors', async () => {
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('refresh-button-wallet-1')).toBeInTheDocument()
      })
      
      // Mock refresh API error
      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'))
      
      // Mock alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
      
      const refreshButton = screen.getByTestId('refresh-button-wallet-1')
      fireEvent.click(refreshButton)
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Refresh failed')
      })
      
      alertSpy.mockRestore()
    })
  })

  describe('Add Wallet Navigation', () => {
    it('should call onAddWallet when add wallet button is clicked', async () => {
      const mockOnAddWallet = jest.fn()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      render(<WalletList {...defaultProps} onAddWallet={mockOnAddWallet} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('add-wallet-button')).toBeInTheDocument()
      })
      
      const addButton = screen.getByTestId('add-wallet-button')
      fireEvent.click(addButton)
      
      expect(mockOnAddWallet).toHaveBeenCalledTimes(1)
    })

    it('should call onAddWallet from empty state button', async () => {
      const mockOnAddWallet = jest.fn()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [] })
      })
      
      render(<WalletList {...defaultProps} onAddWallet={mockOnAddWallet} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('add-wallet-empty-button')).toBeInTheDocument()
      })
      
      const addButton = screen.getByTestId('add-wallet-empty-button')
      fireEvent.click(addButton)
      
      expect(mockOnAddWallet).toHaveBeenCalledTimes(1)
    })

    it('should call onWalletClick when wallet row is clicked', async () => {
      const mockOnWalletClick = jest.fn()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      render(<WalletList {...defaultProps} onWalletClick={mockOnWalletClick} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-row-wallet-1')).toBeInTheDocument()
      })
      
      const walletRow = screen.getByTestId('wallet-row-wallet-1')
      fireEvent.click(walletRow)
      
      expect(mockOnWalletClick).toHaveBeenCalledWith('wallet-1')
    })

    it('should call onWalletClick when view button is clicked', async () => {
      const mockOnWalletClick = jest.fn()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      render(<WalletList {...defaultProps} onWalletClick={mockOnWalletClick} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('view-button-wallet-1')).toBeInTheDocument()
      })
      
      const viewButton = screen.getByTestId('view-button-wallet-1')
      fireEvent.click(viewButton)
      
      expect(mockOnWalletClick).toHaveBeenCalledWith('wallet-1')
    })
  })

  describe('API Integration', () => {
    it('should fetch wallets on component mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(`/api/projects/${defaultProps.projectId}/wallets`)
      })
    })

    it('should handle API response errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch wallets')).toBeInTheDocument()
      })
    })

    it('should handle API response with error status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'error', error: 'Database connection failed' })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      })
    })

    it('should retry fetching wallets when retry button is clicked', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
      
      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: mockWallets })
      })
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('3 wallets connected')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle wallets with missing optional fields', async () => {
      const walletWithMissingFields: WalletItem = {
        id: 'wallet-minimal',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chain: 'ethereum',
        chain_type: 'evm',
        is_active: true,
        last_indexed_block: 0,
        last_synced_at: null,
        total_transactions: 0,
        total_events: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        indexingStatus: {
          state: 'ready'
        }
      }
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [walletWithMissingFields] })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-row-wallet-minimal')).toBeInTheDocument()
        expect(screen.getByTestId('status-badge-ready')).toBeInTheDocument()
      })
    })

    it('should handle unknown chain types gracefully', async () => {
      const walletWithUnknownChain: WalletItem = {
        ...mockWallets[0],
        id: 'wallet-unknown-chain',
        chain: 'unknown-chain'
      }
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [walletWithUnknownChain] })
      })
      
      render(<WalletList {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-row-wallet-unknown-chain')).toBeInTheDocument()
        // Should display the raw chain name when not in CHAIN_NAMES mapping
        expect(screen.getByText('unknown-chain')).toBeInTheDocument()
      })
    })
  })
})