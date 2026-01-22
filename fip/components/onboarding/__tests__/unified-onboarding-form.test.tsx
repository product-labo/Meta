import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnifiedOnboardingForm } from '../unified-onboarding-form'
import { api } from '@/lib/api'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { it } from 'date-fns/locale'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    projects: {
      create: jest.fn()
    },
    wallets: {
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

describe('UnifiedOnboardingForm', () => {
  const mockOnComplete = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue('mock-token')
  })

  it('renders all form fields in correct order', () => {
    render(
      <UnifiedOnboardingForm 
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const formFields = screen.getAllByRole('textbox')
    const selectFields = screen.getAllByRole('combobox')
    
    // Check that all fields are present
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/utility type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/blockchain network/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wallet address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contract abi/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/wallet description/i)).toBeInTheDocument()

    // Submit button
    expect(screen.getByRole('button', { name: /create project & start indexing/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(
      <UnifiedOnboardingForm 
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const submitButton = screen.getByRole('button', { name: /create project & start indexing/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/company name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/please select a utility type/i)).toBeInTheDocument()
      expect(screen.getByText(/wallet address is required/i)).toBeInTheDocument()
      expect(screen.getByText(/please select a blockchain network/i)).toBeInTheDocument()
    })
  })

  it('validates wallet address format based on selected chain', async () => {
    render(
      <UnifiedOnboardingForm 
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Test Company' }
    })

    // Select Ethereum chain
    fireEvent.click(screen.getByRole('combobox', { name: /blockchain network/i }))
    fireEvent.click(screen.getByText('Ethereum'))

    // Enter invalid address
    fireEvent.change(screen.getByLabelText(/wallet address/i), {
      target: { value: 'invalid-address' }
    })

    const submitButton = screen.getByRole('button', { name: /create project & start indexing/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid ethereum address format/i)).toBeInTheDocument()
    })
  })

  it('successfully submits form with valid data', async () => {
    const mockProjectResult = { data: { id: 'project-123' } }
    const mockWalletResult = { data: { id: 'wallet-456' } }

    ;(api.projects.create as jest.Mock).mockResolvedValue(mockProjectResult)
    ;(api.wallets.create as jest.Mock).mockResolvedValue(mockWalletResult)

    render(
      <UnifiedOnboardingForm 
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Fill in all required fields
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Test Company' }
    })

    fireEvent.click(screen.getByRole('combobox', { name: /utility type/i }))
    fireEvent.click(screen.getByText('DeFi'))

    fireEvent.click(screen.getByRole('combobox', { name: /blockchain network/i }))
    fireEvent.click(screen.getByText('Ethereum'))

    fireEvent.change(screen.getByLabelText(/wallet address/i), {
      target: { value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' }
    })

    const submitButton = screen.getByRole('button', { name: /create project & start indexing/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(api.projects.create).toHaveBeenCalledWith(
        {
          name: 'Test Company',
          chain: 'ethereum',
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          abi: '',
          utility: 'defi',
          status: 'active'
        },
        'mock-token'
      )

      expect(api.wallets.create).toHaveBeenCalledWith(
        'project-123',
        {
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          chain: 'ethereum',
          description: ''
        },
        'mock-token'
      )

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('currentProjectId', 'project-123')
      expect(mockOnComplete).toHaveBeenCalledWith('project-123', 'wallet-456')
    })
  })

  it('handles API errors gracefully', async () => {
    const mockError = new Error('API Error')
    ;(api.projects.create as jest.Mock).mockRejectedValue(mockError)

    render(
      <UnifiedOnboardingForm 
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Fill in required fields and submit
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Test Company' }
    })

    fireEvent.click(screen.getByRole('combobox', { name: /utility type/i }))
    fireEvent.click(screen.getByText('DeFi'))

    fireEvent.click(screen.getByRole('combobox', { name: /blockchain network/i }))
    fireEvent.click(screen.getByText('Ethereum'))

    fireEvent.change(screen.getByLabelText(/wallet address/i), {
      target: { value: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0' }
    })

    const submitButton = screen.getByRole('button', { name: /create project & start indexing/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('API Error')
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })
})