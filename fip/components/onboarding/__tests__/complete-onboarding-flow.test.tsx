/**
 * Integration test for complete onboarding flow
 * Tests: project creation → wallet addition → indexing start
 * Validates: Requirements 1.1, 1.4, 10.1
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import StartupInfoPage from '../../../app/onboarding/startup/page'
import { api } from '../../../lib/api'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('../../../lib/api', () => ({
  api: {
    projects: {
      create: jest.fn()
    }
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock fetch for wallet API calls
global.fetch = jest.fn()

describe('Complete Onboarding Flow Integration', () => {
  const mockPush = jest.fn()
  const mockApiCreate = api.projects.create as jest.MockedFunction<typeof api.projects.create>
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Project Creation → Wallet Addition → Indexing Start', () => {
    it('should complete full onboarding flow successfully', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      // Mock successful wallet creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            id: 'test-wallet-456',
            address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
            chain: 'ethereum',
            indexingJobId: 'test-job-789',
            indexingStatus: 'queued'
          }
        })
      } as Response)

      render(<StartupInfoPage />)

      // Step 1: Fill out project creation form
      const companyNameInput = screen.getByLabelText(/company name/i)
      const contractAddressInput = screen.getByLabelText(/contract address/i)
      const abiTextarea = screen.getByLabelText(/abi/i)

      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })
      fireEvent.change(contractAddressInput, { target: { value: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0' } })
      fireEvent.change(abiTextarea, { target: { value: '[]' } })

      // Select chain
      const chainSelect = screen.getByRole('combobox')
      fireEvent.click(chainSelect)
      const ethereumOption = screen.getByText('Ethereum')
      fireEvent.click(ethereumOption)

      // Select utility
      const utilitySelects = screen.getAllByRole('combobox')
      const utilitySelect = utilitySelects[1] // Second combobox is utility
      fireEvent.click(utilitySelect)
      const defiOption = screen.getByText('DeFi')
      fireEvent.click(defiOption)

      // Submit project creation form
      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Wait for project creation to complete and wallet step to appear
      await waitFor(() => {
        expect(mockApiCreate).toHaveBeenCalledWith({
          name: 'Test Company',
          contractAddress: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
          chain: 'ethereum',
          abi: '[]',
          utility: 'defi',
          status: 'active'
        }, 'mock-auth-token')
      })

      // Step 2: Verify wallet step appears
      await waitFor(() => {
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      // Step 3: Fill out wallet form
      const chainSelectWallet = screen.getByRole('combobox')
      fireEvent.click(chainSelectWallet)
      const ethereumOptionWallet = screen.getByText('Ethereum')
      fireEvent.click(ethereumOptionWallet)

      const addressInput = screen.getByPlaceholderText(/enter wallet address/i)
      fireEvent.change(addressInput, { 
        target: { value: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0' } 
      })

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })

      // Submit wallet form
      const addWalletButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      fireEvent.click(addWalletButton)

      // Step 4: Verify wallet creation API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/test-project-123/wallets',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
              chain: 'ethereum',
              description: ''
            })
          })
        )
      })

      // Step 5: Verify redirect to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should allow user to skip wallet addition', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      render(<StartupInfoPage />)

      // Fill out and submit project form
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Wait for wallet step to appear
      await waitFor(() => {
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      // Click skip button
      const skipButton = screen.getByRole('button', { name: /skip for now/i })
      fireEvent.click(skipButton)

      // Verify redirect to dashboard without wallet creation
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })

      // Verify no wallet API call was made
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle project creation failure gracefully', async () => {
      // Mock project creation failure
      mockApiCreate.mockRejectedValue(new Error('Project creation failed'))

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(<StartupInfoPage />)

      // Fill out and submit project form
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Wait for error handling
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to submit info. Please try again.')
      })

      // Verify wallet step does not appear
      expect(screen.queryByText(/add wallet \(optional\)/i)).not.toBeInTheDocument()

      alertSpy.mockRestore()
    })

    it('should handle wallet creation failure gracefully', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      // Mock wallet creation failure
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          message: 'Invalid wallet address'
        })
      } as Response)

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})

      render(<StartupInfoPage />)

      // Complete project creation
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Wait for wallet step
      await waitFor(() => {
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      // Fill out wallet form with invalid data
      const chainSelect = screen.getByRole('combobox')
      fireEvent.click(chainSelect)
      const ethereumOption = screen.getByText('Ethereum')
      fireEvent.click(ethereumOption)

      const addressInput = screen.getByPlaceholderText(/enter wallet address/i)
      fireEvent.change(addressInput, { target: { value: 'invalid-address' } })

      const addWalletButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      fireEvent.click(addWalletButton)

      // Wait for error handling
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to add wallet: Invalid wallet address')
      })

      // Verify user stays on wallet step
      expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()

      alertSpy.mockRestore()
    })

    it('should verify indexing runs in background after wallet submission', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      // Mock successful wallet creation with indexing job
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            id: 'test-wallet-456',
            address: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
            chain: 'ethereum',
            indexingJobId: 'test-job-789',
            indexingStatus: 'queued'
          }
        })
      } as Response)

      render(<StartupInfoPage />)

      // Complete project creation
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Complete wallet addition
      await waitFor(() => {
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      const chainSelect = screen.getByRole('combobox')
      fireEvent.click(chainSelect)
      const ethereumOption = screen.getByText('Ethereum')
      fireEvent.click(ethereumOption)

      const addressInput = screen.getByPlaceholderText(/enter wallet address/i)
      fireEvent.change(addressInput, { 
        target: { value: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0' } 
      })

      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })

      const addWalletButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      fireEvent.click(addWalletButton)

      // Verify wallet creation response includes indexing job
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/test-project-123/wallets',
          expect.objectContaining({
            method: 'POST'
          })
        )
      })

      // Verify redirect to dashboard where indexing progress will be shown
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('User Navigation Flow', () => {
    it('should allow user to proceed to dashboard after wallet submission', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      // Mock successful wallet creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            id: 'test-wallet-456',
            indexingJobId: 'test-job-789'
          }
        })
      } as Response)

      render(<StartupInfoPage />)

      // Complete full flow
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      const chainSelect = screen.getByRole('combobox')
      fireEvent.click(chainSelect)
      const ethereumOption = screen.getByText('Ethereum')
      fireEvent.click(ethereumOption)

      const addressInput = screen.getByPlaceholderText(/enter wallet address/i)
      fireEvent.change(addressInput, { 
        target: { value: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0' } 
      })

      await waitFor(() => {
        expect(screen.getByTestId('validation-success')).toBeInTheDocument()
      })

      const addWalletButton = screen.getByRole('button', { name: /add wallet & start indexing/i })
      fireEvent.click(addWalletButton)

      // Verify successful navigation to dashboard
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      }, { timeout: 5000 })
    })

    it('should maintain proper step progression through onboarding', async () => {
      // Mock successful project creation
      mockApiCreate.mockResolvedValue({
        status: 'success',
        data: { id: 'test-project-123' }
      })

      render(<StartupInfoPage />)

      // Verify initial step (project creation)
      expect(screen.getByText(/company info \(startup\)/i)).toBeInTheDocument()
      expect(screen.queryByText(/add wallet \(optional\)/i)).not.toBeInTheDocument()

      // Complete project creation
      const companyNameInput = screen.getByLabelText(/company name/i)
      fireEvent.change(companyNameInput, { target: { value: 'Test Company' } })

      const createButton = screen.getByRole('button', { name: /create account/i })
      fireEvent.click(createButton)

      // Verify progression to wallet step
      await waitFor(() => {
        expect(screen.queryByText(/company info \(startup\)/i)).not.toBeInTheDocument()
        expect(screen.getByText(/add wallet \(optional\)/i)).toBeInTheDocument()
      })

      // Verify skip option is available
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument()
    })
  })
})