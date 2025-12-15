"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OnboardingCard } from "@/components/onboarding/onboarding-card"
import { Button } from "@/components/ui/button"
import { Rocket, Search } from "lucide-react"

type Role = "startup" | "researcher" | null

export default function RoleSelectionPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<Role>(null)

  const handleContinue = () => {
    if (selectedRole === "startup") {
      router.push("/onboarding/startup")
    } else if (selectedRole === "researcher") {
      router.push("/onboarding/wallet")
    }
  }

  return (
    <OnboardingCard currentStep={1} totalSteps={3} showSteps={false}>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Setup Account</h1>
        <p className="text-muted-foreground mt-1">Select Your Primary Role</p>
      </div>

      <div className="space-y-4 mb-6">
        <div
          onClick={() => setSelectedRole("startup")}
          className={`cursor-pointer w-full p-6 rounded-2xl border flex items-center gap-6 transition-all ${selectedRole === "startup" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
            }`}
        >
          <div className="w-14 h-14 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
            <Rocket className="h-6 w-6" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-bold text-gray-900">I'm a Startup</h3>
            <p className="text-sm text-gray-500 mt-1">Looking for fundings and support</p>
          </div>
          <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedRole === "startup" ? "bg-white border-primary" : "border-gray-300"
            }`}>
            {selectedRole === "startup" && (
              <div className="w-3 h-3 bg-primary rounded-sm" />
            )}
          </div>
        </div>

        <div
          onClick={() => setSelectedRole("researcher")}
          className={`cursor-pointer w-full p-6 rounded-2xl border flex items-center gap-6 transition-all ${selectedRole === "researcher" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"
            }`}
        >
          <div className="w-14 h-14 rounded-full bg-white border border-gray-100 flex items-center justify-center shrink-0">
            <Search className="h-6 w-6" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-lg font-bold text-gray-900">I'm a Researcher</h3>
            <p className="text-sm text-gray-500 mt-1">Explore data and industry trends</p>
          </div>
          <div className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedRole === "researcher" ? "bg-white border-primary" : "border-gray-300"
            }`}>
            {selectedRole === "researcher" && (
              <div className="w-3 h-3 bg-primary rounded-sm" />
            )}
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={handleContinue} disabled={!selectedRole}>
        Continue
      </Button>
    </OnboardingCard>
  )
}
