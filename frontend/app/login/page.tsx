"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { AuthDivider } from "@/components/auth/divider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, EyeOff, Eye } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const redirectTo = searchParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate login process
    if (!email || !password) {
      alert('Please enter both email and password')
      return
    }

    // Mock successful login
    const mockUser = {
      id: '1',
      email: email,
      roles: ['startup'],
      is_verified: true,
      onboarding_completed: true,
    }

    const mockToken = 'mock-jwt-token-' + Date.now()

    // Update Global Auth State
    login(mockToken, mockUser)

    // Handle redirect logic
    if (redirectTo === 'analyzer') {
      router.push("/analyzer")
      return
    }

    // Default redirect based on role
    if (mockUser.roles.includes('startup')) {
      router.push("/startup")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-muted-foreground mt-1">Welcome back to MetaGauge</p>
        <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
          Demo: Use any email and password
        </p>
      </div>

      <OAuthButtons mode="signin" />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10"
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>

      <p className="text-center text-sm mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  )
}
