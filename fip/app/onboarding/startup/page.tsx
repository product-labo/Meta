"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingCard } from "@/components/onboarding/onboarding-card"
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

import { api } from "@/lib/api"

export default function StartupInfoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: "",
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
        contractAddress: formData.contractAddress,
        chain: formData.chain,
        abi: formData.abi,
        utility: formData.utility,
        status: 'active'
      };

      await api.projects.create(payload, token);
      // Submit startup info -> Navigate to startup dashboard
      router.push("/startup")
    } catch (error) {
      console.error("Startup info submission failed:", error)
      alert("Failed to submit info. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingCard currentStep={2} totalSteps={3} showSteps={true}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Company Info (Startup)</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            placeholder="Company Name"
            value={formData.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contractAddress">Contract Address</Label>
          <Input
            id="contractAddress"
            placeholder="Contract Address"
            value={formData.contractAddress}
            onChange={(e) => handleChange("contractAddress", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Chain</Label>
          <Select onValueChange={(val) => handleChange("chain", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Lisk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lisk">Lisk</SelectItem>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="abi">ABI</Label>
          <Textarea
            id="abi"
            placeholder="Type your message here"
            className="min-h-[100px] resize-none"
            value={formData.abi}
            onChange={(e) => handleChange("abi", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Utility</Label>
          <Select onValueChange={(val) => handleChange("utility", val)}>
            <SelectTrigger>
              <SelectValue placeholder="DeFi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="defi">DeFi</SelectItem>
              <SelectItem value="nft">NFT</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-center py-2">
          <button type="button" className="text-sm text-muted-foreground hover:underline" onClick={() => router.push('/onboarding/role')}>
            Switch To Researcher
          </button>
        </div>

        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </form>
    </OnboardingCard>
  )
}
