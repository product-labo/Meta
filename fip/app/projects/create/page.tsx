"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WalletOnboardingForm } from "@/components/onboarding/wallet-onboarding-form"
import { ArrowLeft } from "lucide-react"

import { api } from "@/lib/api"

export default function CreateProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showWalletStep, setShowWalletStep] = useState(false)
  const [projectId, setProjectId] = useState<string>("")
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    contractAddress: "",
    chain: "",
    abi: "",
    utility: ""
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("No auth token found");

      const payload = {
        name: formData.companyName,
        description: formData.description,
        contractAddress: formData.contractAddress,
        chain: formData.chain,
        abi: formData.abi,
        utility: formData.utility,
        status: 'active'
      };

      const result = await api.projects.create(payload, token);
      
      // Store project ID and show wallet step
      setProjectId(result.data?.id || result.id || 'temp-project-id');
      setShowWalletStep(true);
    } catch (error) {
      console.error("Project creation failed:", error)
      alert("Failed to create project. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleWalletComplete = (walletId: string) => {
    // Store project ID for dashboard access
    localStorage.setItem('currentProjectId', projectId)
    // Wallet added successfully, redirect to dashboard
    router.push("/dashboard")
  }

  const handleWalletError = (error: string) => {
    console.error("Wallet addition failed:", error)
    alert(`Failed to add wallet: ${error}`)
  }

  const handleSkipWallet = () => {
    // Store project ID for dashboard access even when skipping wallet
    localStorage.setItem('currentProjectId', projectId)
    // Skip wallet addition and go to dashboard
    router.push("/dashboard")
  }

  const handleBack = () => {
    if (showWalletStep) {
      setShowWalletStep(false)
    } else {
      router.push("/dashboard")
    }
  }

  // Show wallet step after project creation
  if (showWalletStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>Add Wallet (Optional)</CardTitle>
                <CardDescription>
                  Connect your project's wallet to start indexing blockchain data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <WalletOnboardingForm
              projectId={projectId}
              onComplete={handleWalletComplete}
              onError={handleWalletError}
            />

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={handleSkipWallet}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Add a new project to track its wallet analytics
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Project Name</Label>
              <Input
                id="companyName"
                placeholder="Enter project name"
                value={formData.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your project"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractAddress">Contract Address</Label>
              <Input
                id="contractAddress"
                placeholder="0x..."
                value={formData.contractAddress}
                onChange={(e) => handleChange("contractAddress", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Chain</Label>
              <Select onValueChange={(val) => handleChange("chain", val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select blockchain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="lisk">Lisk</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="starknet-mainnet">Starknet Mainnet</SelectItem>
                  <SelectItem value="starknet-sepolia">Starknet Sepolia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="abi">ABI (Optional)</Label>
              <Textarea
                id="abi"
                placeholder="Contract ABI JSON"
                className="min-h-[100px] resize-none"
                value={formData.abi}
                onChange={(e) => handleChange("abi", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select onValueChange={(val) => handleChange("utility", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defi">DeFi</SelectItem>
                  <SelectItem value="nft">NFT</SelectItem>
                  <SelectItem value="gaming">Gaming</SelectItem>
                  <SelectItem value="dao">DAO</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}