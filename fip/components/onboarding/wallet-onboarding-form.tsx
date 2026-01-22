'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { api } from '@/lib/api'

// Chain types supported by the system
export type ChainType = 
  | 'ethereum' 
  | 'polygon' 
  | 'lisk' 
  | 'arbitrum' 
  | 'optimism' 
  | 'bsc' 
  | 'starknet-mainnet' 
  | 'starknet-sepolia'

// Chain configuration with validation rules and display info
const CHAIN_CONFIG = {
  ethereum: {
    name: 'Ethereum',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  polygon: {
    name: 'Polygon',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  lisk: {
    name: 'Lisk',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  arbitrum: {
    name: 'Arbitrum',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  optimism: {
    name: 'Optimism',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  bsc: {
    name: 'BNB Smart Chain',
    type: 'evm' as const,
    addressLength: 42,
    example: '0x742d35cc6634c0532925a3b844bc9e7595f0beb0',
    description: '42-character hexadecimal address starting with 0x'
  },
  'starknet-mainnet': {
    name: 'Starknet Mainnet',
    type: 'starknet' as const,
    addressLength: 66, // 64+ characters, typically 66 with 0x
    example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    description: '64+ character hexadecimal address starting with 0x'
  },
  'starknet-sepolia': {
    name: 'Starknet Sepolia',
    type: 'starknet' as const,
    addressLength: 66,
    example: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
    description: '64+ character hexadecimal address starting with 0x'
  }
} as const

// Address validation functions
const validateEVMAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

const validateStarknetAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{63,}$/.test(address)
}

const validateAddress = (address: string, chain: ChainType): boolean => {
  const config = CHAIN_CONFIG[chain]
  if (config.type === 'evm') {
    return validateEVMAddress(address)
  } else if (config.type === 'starknet') {
    return validateStarknetAddress(address)
  }
  return false
}

// Form schema with dynamic validation based on selected chain
const createFormSchema = (selectedChain?: ChainType) => {
  return z.object({
    address: z
      .string()
      .min(1, 'Wallet address is required')
      .refine(
        (address) => {
          if (!selectedChain) return true // Skip validation if no chain selected
          return validateAddress(address, selectedChain)
        },
        (val) => {
          if (!selectedChain) return { message: 'Please select a chain first' }
          const config = CHAIN_CONFIG[selectedChain]
          return {
            message: `Invalid ${config.name} address format. Expected: ${config.description}`
          }
        }
      ),
    chain: z.string().min(1, 'Please select a blockchain network'),
    description: z.string().optional()
  }) satisfies z.ZodType<WalletFormData>
}

export interface WalletOnboardingFormProps {
  projectId: string
  onComplete: (walletId: string) => void
  onError?: (error: string) => void
  className?: string
}

export interface WalletFormData {
  address: string
  chain: string
  description?: string
}

export function WalletOnboardingForm({ 
  projectId, 
  onComplete, 
  onError,
  className
}: WalletOnboardingFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedChain, setSelectedChain] = React.useState<ChainType>()
  const [validationState, setValidationState] = React.useState<'idle' | 'valid' | 'invalid'>('idle')

  // Create form with dynamic schema
  const form = useForm<WalletFormData>({
    resolver: zodResolver(createFormSchema(selectedChain)),
    defaultValues: {
      address: '',
      chain: '',
      description: ''
    }
  })

  // Watch address field for real-time validation
  const watchedAddress = form.watch('address')
  const watchedChain = form.watch('chain')

  // Real-time address validation effect
  React.useEffect(() => {
    if (!watchedAddress || !watchedChain) {
      setValidationState('idle')
      return
    }

    const isValid = validateAddress(watchedAddress, watchedChain as ChainType)
    setValidationState(isValid ? 'valid' : 'invalid')
  }, [watchedAddress, watchedChain])

  // Handle chain selection change
  const handleChainChange = (value: string) => {
    const chainType = value as ChainType
    setSelectedChain(chainType)
    form.setValue('chain', value)
    
    // Re-validate address when chain changes
    if (watchedAddress) {
      form.trigger('address')
    }
  }

  // Handle form submission
  const onSubmit = async (data: WalletFormData) => {
    setIsSubmitting(true)
    
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.')
      }

      // Call the API to create wallet using the API library
      const result = await api.wallets.create(projectId, {
        address: data.address,
        chain: data.chain,
        description: data.description
      }, token)
      
      // Call success callback with wallet ID
      onComplete(result.data?.id || result.id)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      onError?.(errorMessage)
      
      // Set form error
      form.setError('root', {
        type: 'manual',
        message: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedChainConfig = selectedChain ? CHAIN_CONFIG[selectedChain] : null

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Add Wallet Address</h2>
          <p className="text-muted-foreground">
            Connect your project's wallet to start indexing blockchain data
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Chain Selection */}
            <FormField
              control={form.control}
              name="chain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blockchain Network</FormLabel>
                  <Select onValueChange={handleChainChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a blockchain network" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ethereum">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Ethereum
                        </div>
                      </SelectItem>
                      <SelectItem value="polygon">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          Polygon
                        </div>
                      </SelectItem>
                      <SelectItem value="lisk">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Lisk
                        </div>
                      </SelectItem>
                      <SelectItem value="arbitrum">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
                          Arbitrum
                        </div>
                      </SelectItem>
                      <SelectItem value="optimism">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Optimism
                        </div>
                      </SelectItem>
                      <SelectItem value="bsc">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          BNB Smart Chain
                        </div>
                      </SelectItem>
                      <SelectItem value="starknet-mainnet">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          Starknet Mainnet
                        </div>
                      </SelectItem>
                      <SelectItem value="starknet-sepolia">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-300" />
                          Starknet Sepolia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Wallet Address Input */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Address</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder={selectedChainConfig?.example || "Enter wallet address"}
                        {...field}
                        className={`pr-10 ${
                          validationState === 'valid' 
                            ? 'border-green-500 focus-visible:border-green-500' 
                            : validationState === 'invalid' 
                            ? 'border-red-500 focus-visible:border-red-500' 
                            : ''
                        }`}
                      />
                    </FormControl>
                    {/* Validation indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validationState === 'valid' && (
                        <CheckCircle className="h-4 w-4 text-green-500" data-testid="validation-success" />
                      )}
                      {validationState === 'invalid' && (
                        <AlertCircle className="h-4 w-4 text-red-500" data-testid="validation-error" />
                      )}
                    </div>
                  </div>
                  
                  {/* Chain-specific format hint */}
                  {selectedChainConfig && (
                    <FormDescription className="flex items-start gap-2">
                      <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <div className="font-medium">{selectedChainConfig.name} Address Format:</div>
                        <div>{selectedChainConfig.description}</div>
                        <div className="text-xs mt-1 font-mono bg-muted px-2 py-1 rounded">
                          Example: {selectedChainConfig.example}
                        </div>
                      </div>
                    </FormDescription>
                  )}
                  
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main treasury wallet, DEX contract, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a description to help identify this wallet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form-level error */}
            {form.formState.errors.root && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding Wallet...
                </>
              ) : (
                'Add Wallet & Start Indexing'
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}