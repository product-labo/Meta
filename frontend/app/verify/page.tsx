"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth/auth-provider"

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const redirectTo = searchParams.get('redirect')

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate OTP verification
    if (otp.length !== 6) {
      alert('Please enter a 6-digit verification code')
      setLoading(false)
      return
    }

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock successful verification
    const mockUser = {
      id: '1',
      email: email,
      roles: ['startup'],
      is_verified: true,
      onboarding_completed: true,
    }

    const mockToken = 'mock-jwt-token-' + Date.now()

    // Login the user with the mock token
    login(mockToken, mockUser)

    // Handle redirect
    if (redirectTo === 'analyzer') {
      router.push('/analyzer')
    } else if (mockUser.onboarding_completed === false) {
      router.push("/onboarding/role")
    } else {
      const roles = mockUser.roles || []
      if (roles.includes('startup')) {
        router.push("/startup")
      } else {
        router.push("/dashboard")
      }
    }
    
    setLoading(false)
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Verify Your Email</h1>
        <p className="text-muted-foreground mt-1">
          We sent a verification code to {email}
        </p>
        <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
          Demo: Use any 6-digit code (e.g., 123456)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className="text-center text-lg tracking-widest"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
          {loading ? "Verifying..." : "Verify Email"}
        </Button>
      </form>

      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{" "}
          <button 
            type="button"
            className="font-semibold hover:underline text-primary"
            onClick={() => {
              // Implement resend logic here
              alert("Resend functionality would be implemented here")
            }}
          >
            Resend
          </button>
        </p>
      </div>
    </AuthCard>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <AuthCard>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-muted-foreground mt-1">Loading...</p>
        </div>
      </AuthCard>
    }>
      <VerifyForm />
    </Suspense>
  )
}