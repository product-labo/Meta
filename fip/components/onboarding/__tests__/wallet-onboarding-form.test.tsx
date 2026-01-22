import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WalletOnboardingForm } from '../wallet-onboarding-form'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WalletOnboardingForm', () => {
  const defaultProps = {
    projectId: 'test-project-id',
    onComplete: jest.fn(),
    onError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Component Rendering', () => {
    it('should render the form with all required fields', () => {
      render(<WalletOnboardingForm {...defaultProps} />)
      
      expect(screen.getByText('Add Wallet Address')).toBeInTheDocument()
      expect(screen.getByText('Connect your project\'s wallet to start indexing blockchain data')).toBeInTheDocument()
      expect(screen.getByLabelText('Blockchain Network')).toBeInTheDocument()
      expect(screen.getByLabelText('Wallet Address')).toBeInTheDocument()
      expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add wallet & start indexing/i })).toBeInTheDocument()
    })

    it('should render chain selection dropdown with all supported chains', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      
      // Check for EVM chains
      expect(screen.getByText('Ethereum')).toBeInTheDocument()
      expect(screen.getByText('Polygon')).toBeInTheDocument()
      expect(screen.getByText('Lisk')).toBeInTheDocument()
      expect(screen.getByText('Arbitrum')).toBeInTheDocument()
      expect(screen.getByText('Optimism')).toBeInTheDocument()
      expect(screen.getByText('BNB Smart Chain')).toBeInTheDocument()
      
      // Check for Starknet chains
      expect(screen.getByText('Starknet Mainnet')).toBeInTheDocument()
      expect(screen.getByText('Starknet Sepolia')).toBeInTheDocument()
    })
  })

  describe('Address Validation UI Feedback', () => {
    it('should show validation success for valid EVM address', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      // Enter valid EVM address
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Should show success indicator
      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid EVM address', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      // Enter invalid address
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, 'invalid-address')
      
      // Should show error indicator
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
      })
    })

    it('should show validation success for valid Starknet address', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Starknet chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Starknet Mainnet'))
      
      // Enter valid Starknet address
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')
      
      // Should show success indicator
      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid Starknet address', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Starknet chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Starknet Mainnet'))
      
      // Enter invalid address (too short for Starknet)
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Should show error indicator
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
      })
    })
  })

  describe('Chain Selection Behavior', () => {
    it('should update address placeholder when chain is selected', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      // Check that placeholder updates to Ethereum example
      const addressInput = screen.getByLabelText('Wallet Address')
      expect(addressInput).toHaveAttribute('placeholder', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
    })

    it('should show chain-specific format hints', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum chain
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      // Should show EVM format description
      expect(screen.getByText('Ethereum Address Format:')).toBeInTheDocument()
      expect(screen.getByText('42-character hexadecimal address starting with 0x')).toBeInTheDocument()
    })

    it('should re-validate address when chain changes', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum and enter valid EVM address
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Should be valid for EVM
      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })
      
      // Change to Starknet
      await user.click(chainSelect)
      await user.click(screen.getByText('Starknet Mainnet'))
      
      // Same address should now be invalid for Starknet
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
      })
    })

    it('should clear validation errors when chain changes', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select Ethereum and enter invalid address
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, 'invalid')
      
      // Should show error
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
      })
      
      // Change chain
      await user.click(chainSelect)
      await user.click(screen.getByText('Polygon'))
      
      // Error should still be there since address is still invalid
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: 'success',
          data: { id: 'wallet-123' }
        })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)
      
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Fill form
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      const descriptionInput = screen.getByLabelText('Description (Optional)')
      await user.type(descriptionInput, 'Test wallet')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Check API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects/test-project-id/wallets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            chain: 'ethereum',
            description: 'Test wallet'
          })
        })
      })
      
      // Check success callback
      expect(defaultProps.onComplete).toHaveBeenCalledWith('wallet-123')
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        ok: false,
        json: async () => ({
          message: 'Wallet already exists'
        })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)
      
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Fill form
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Check error handling
      await waitFor(() => {
        expect(screen.getByText('Wallet already exists')).toBeInTheDocument()
      })
      
      expect(defaultProps.onError).toHaveBeenCalledWith('Wallet already exists')
    })

    it('should disable submit button when form is invalid', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      
      // Button should be disabled initially
      expect(submitButton).toBeDisabled()
      
      // Select chain but don't enter address
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      // Button should still be disabled
      expect(submitButton).toBeDisabled()
      
      // Enter invalid address
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, 'invalid')
      
      // Button should still be disabled
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should enable submit button when form is valid', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Fill form with valid data
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Button should be enabled
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Error Display', () => {
    it('should display validation errors inline', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText('Please select a blockchain network')).toBeInTheDocument()
        expect(screen.getByText('Wallet address is required')).toBeInTheDocument()
      })
    })

    it('should display format-specific error messages', async () => {
      const user = userEvent.setup()
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Select chain and enter invalid address
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, 'invalid-address')
      
      // Try to submit
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Should show format-specific error
      await waitFor(() => {
        expect(screen.getByText(/Invalid Ethereum address format/)).toBeInTheDocument()
        expect(screen.getByText(/Expected: 42-character hexadecimal address starting with 0x/)).toBeInTheDocument()
      })
    })

    it('should display network errors from API', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Fill and submit form
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Should show network error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup()
      // Mock a delayed response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ status: 'success', data: { id: 'wallet-123' } })
        }), 100))
      )
      
      render(<WalletOnboardingForm {...defaultProps} />)
      
      // Fill form
      const chainSelect = screen.getByRole('combobox', { name: /blockchain network/i })
      await user.click(chainSelect)
      await user.click(screen.getByText('Ethereum'))
      
      const addressInput = screen.getByLabelText('Wallet Address')
      await user.type(addressInput, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText('Adding Wallet...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Wait for completion
      await waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled()
      })
    })
  })
})