"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingCard } from "@/components/onboarding/onboarding-card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Wallet } from "lucide-react"

export default function WalletConnectionPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectWallet = async () => {
    setIsConnecting(true)
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setWalletAddress("0x1gfe45.......760")
    setIsConnecting(false)
  }

  const handleFinish = () => {
    router.push("/dashboard")
  }

  return (
    <OnboardingCard currentStep={1} totalSteps={3}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Set Spending Wallet</h1>
        <p className="text-muted-foreground mt-1">MInt Free 150 mGuage</p>
      </div>

      <div className="space-y-4 mb-6">
        <Label>Connect Wallet*</Label>
        <div className="flex items-center gap-3 p-3 border rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <span className="text-muted-foreground text-sm">{walletAddress || "0x1gfe45.......760"}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleConnectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        </div>
      </div>

      <Button className="w-full" onClick={handleFinish}>
        Finish
      </Button>
    </OnboardingCard>
  )
}
