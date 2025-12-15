import type React from "react"
import { MetaGaugeLogo } from "@/components/icons/metagauge-logo"
import Link from "next/link"
import { StepIndicator } from "./step-indicator"

interface OnboardingCardProps {
  children: React.ReactNode
  currentStep?: number
  totalSteps?: number
  showSteps?: boolean
}

export function OnboardingCard({ children, currentStep = 1, totalSteps = 3, showSteps = true }: OnboardingCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/50 via-background to-blue-50/30 p-4">
      {showSteps && <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border p-8">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <MetaGaugeLogo className="h-6 w-8" />
          <span className="font-semibold text-lg">MetaGauge</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
