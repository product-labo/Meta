"use client"

import { useRouter } from "next/navigation"
import { OnboardingCard } from "@/components/onboarding/onboarding-card"
import { Button } from "@/components/ui/button"
import { UnifiedOnboardingForm } from "@/components/onboarding/unified-onboarding-form"

export default function StartupInfoPage() {
  const router = useRouter()

  const handleOnboardingComplete = (projectId: string, walletId: string) => {
    // Store project ID for dashboard access
    localStorage.setItem('currentProjectId', projectId)
    // Redirect to dashboard with indexing in progress
    router.push("/dashboard")
  }

  const handleOnboardingError = (error: string) => {
    console.error("Onboarding failed:", error)
    alert(`Failed to complete onboarding: ${error}`)
  }

  return (
    <OnboardingCard currentStep={2} totalSteps={2} showSteps={true}>
      <UnifiedOnboardingForm
        onComplete={handleOnboardingComplete}
        onError={handleOnboardingError}
      />
      
      <div className="text-center mt-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/onboarding/role')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Switch To Researcher
        </Button>
      </div>
    </OnboardingCard>
  )
}
