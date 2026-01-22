import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IndexingProgressWidget } from '../indexing-progress-widget'

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
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
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

  // Helper method to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('IndexingProgressWidget', () => {
  const defaultProps = {
    walletId: 'test-wallet-id',
    projectId: 'test-project-id',
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

  describe('Component Rendering', () => {
    it('should render the progress widget with initial loading state', () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      expect(screen.getByTestId('progress-widget')).toBeInTheDocument()
      expect(screen.getByText('Indexing Progress')).toBeInTheDocument()
      expect(screen.getByText('Real-time blockchain data indexing status')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show connecting status initially', () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      // Should show connecting indicator (spinning refresh icon)
      const connectingIcon = document.querySelector('.animate-spin')
      expect(connectingIcon).toBeInTheDocument()
    })
  })

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection on mount', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
        const ws = MockWebSocket.instances[0]
        expect(ws.url).toContain(`/ws/indexing/${defaultProps.walletId}`)
      })
    })

    it('should show connected status when WebSocket opens', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        // Should show connected indicator (wifi icon)
        const connectedIcon = document.querySelector('.text-green-500')
        expect(connectedIcon).toBeInTheDocument()
      })
    })

    it('should handle WebSocket connection errors', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      ws.simulateError()
      
      await waitFor(() => {
        // Should show error indicator
        const errorIcon = document.querySelector('.text-red-500')
        expect(errorIcon).toBeInTheDocument()
      })
    })

    it('should attempt reconnection after connection loss', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      ws.close(1006, 'Connection lost') // Abnormal closure
      
      // Should attempt reconnection
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(1)
      }, { timeout: 2000 })
    })
  })

  describe('Progress Display Updates', () => {
    it('should display progress updates from WebSocket messages', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      const progressData = {
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 60,
        },
      }
      
      ws.simulateMessage(progressData)
      
      await waitFor(() => {
        expect(screen.getByText('Indexing')).toBeInTheDocument()
        expect(screen.getByTestId('current-block')).toHaveTextContent('150')
        expect(screen.getByTestId('total-blocks')).toHaveTextContent('200')
        expect(screen.getByTestId('transactions-found')).toHaveTextContent('25')
        expect(screen.getByTestId('events-found')).toHaveTextContent('10')
        expect(screen.getByTestId('blocks-per-second')).toHaveTextContent('2.5 blocks/sec')
        expect(screen.getByTestId('estimated-time')).toHaveTextContent('1m')
      })
    })

    it('should update progress bar percentage correctly', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      const progressData = {
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 60,
        },
      }
      
      ws.simulateMessage(progressData)
      
      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-bar')
        // Progress should be (150-100+1)/(200) * 100 = 25.5%
        expect(progressBar).toHaveAttribute('aria-valuenow', '25.5')
      })
    })

    it('should ignore non-monotonic progress updates', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      
      // Send initial progress
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 60,
        },
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('current-block')).toHaveTextContent('150')
      })
      
      // Send non-monotonic update (lower block number)
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 140, // Lower than previous
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 20,
          eventsFound: 8,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 70,
        },
      })
      
      // Should still show the previous higher block number
      await waitFor(() => {
        expect(screen.getByTestId('current-block')).toHaveTextContent('150')
      })
    })

    it('should handle completion messages', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      
      // Send initial progress
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 60,
        },
      })
      
      // Send completion message
      ws.simulateMessage({
        type: 'complete',
        data: {
          walletId: defaultProps.walletId,
        },
      })
      
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })
  })

  describe('Error State Handling', () => {
    it('should display error messages from WebSocket', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      ws.simulateMessage({
        type: 'error',
        data: {
          walletId: defaultProps.walletId,
          errorMessage: 'RPC connection failed',
        },
      })
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('RPC connection failed')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()
      })
    })

    it('should show retry button for connection errors', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      
      // Simulate multiple connection failures to exceed retry limit
      for (let i = 0; i < 6; i++) {
        ws.simulateError()
        ws.close(1006, 'Connection failed')
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Connection failed after \d+ attempts/)).toBeInTheDocument()
        expect(screen.getByText('Retry Connection')).toBeInTheDocument()
      })
    })

    it('should handle retry button click', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      
      // Simulate connection failure
      for (let i = 0; i < 6; i++) {
        ws.simulateError()
        ws.close(1006, 'Connection failed')
      }
      
      await waitFor(() => {
        expect(screen.getByText('Retry Connection')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByText('Retry Connection')
      fireEvent.click(retryButton)
      
      // Should attempt new connection
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(1)
      })
    })
  })

  describe('Reconnection Logic', () => {
    it('should implement exponential backoff for reconnection', async () => {
      jest.useFakeTimers()
      
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      ws.close(1006, 'Connection lost')
      
      // First reconnection attempt should happen after 1 second
      jest.advanceTimersByTime(1000)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(2)
      })
      
      // Simulate second failure
      const ws2 = MockWebSocket.instances[1]
      ws2.close(1006, 'Connection lost')
      
      // Second reconnection attempt should happen after 2 seconds
      jest.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(3)
      })
      
      jest.useRealTimers()
    })

    it('should stop reconnecting after max retries', async () => {
      jest.useFakeTimers()
      
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      // Simulate 5 connection failures
      for (let i = 0; i < 5; i++) {
        const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
        ws.close(1006, 'Connection lost')
        
        // Advance time for reconnection
        jest.advanceTimersByTime(Math.pow(2, i) * 1000)
        
        await waitFor(() => {
          expect(MockWebSocket.instances).toHaveLength(i + 2)
        })
      }
      
      // 6th failure should not trigger reconnection
      const lastWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      lastWs.close(1006, 'Connection lost')
      
      jest.advanceTimersByTime(10000) // Wait longer than any backoff
      
      // Should not create new connection
      expect(MockWebSocket.instances).toHaveLength(6)
      
      jest.useRealTimers()
    })
  })

  describe('API Integration', () => {
    it('should fetch initial status from API on mount', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            walletId: defaultProps.walletId,
            status: 'queued',
            currentBlock: 0,
            totalBlocks: 0,
            startBlock: 100,
            endBlock: 299,
            transactionsFound: 0,
            eventsFound: 0,
            blocksPerSecond: 0,
            estimatedTimeRemaining: 0,
          },
        }),
      }
      
      mockFetch.mockResolvedValueOnce(mockResponse)
      
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/projects/${defaultProps.projectId}/wallets/${defaultProps.walletId}/indexing-status`
        )
      })
      
      await waitFor(() => {
        expect(screen.getByText('Queued')).toBeInTheDocument()
      })
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))
      
      render(<IndexingProgressWidget {...defaultProps} />)
      
      // Should still render the component without crashing
      expect(screen.getByTestId('progress-widget')).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    it('should format time remaining correctly', async () => {
      render(<IndexingProgressWidget {...defaultProps} />)
      
      await waitFor(() => {
        expect(MockWebSocket.instances).toHaveLength(1)
      })
      
      const ws = MockWebSocket.instances[0]
      
      // Test seconds
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 45,
        },
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('estimated-time')).toHaveTextContent('45s')
      })
      
      // Test minutes
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 120,
        },
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('estimated-time')).toHaveTextContent('2m')
      })
      
      // Test hours
      ws.simulateMessage({
        type: 'progress',
        data: {
          walletId: defaultProps.walletId,
          status: 'indexing',
          currentBlock: 150,
          totalBlocks: 200,
          startBlock: 100,
          endBlock: 299,
          transactionsFound: 25,
          eventsFound: 10,
          blocksPerSecond: 2.5,
          estimatedTimeRemaining: 7200,
        },
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('estimated-time')).toHaveTextContent('2h')
      })
    })
  })
})