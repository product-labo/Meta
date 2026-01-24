"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { AuthDivider } from "@/components/auth/divider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, EyeOff, Eye } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const redirectTo = searchParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate signup process
    if (!email || !password) {
      alert('Please enter both email and password')
      setLoading(false)
      return
    }

    // Simulate a brief delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock successful signup - redirect to verify page
    const verifyUrl = redirectTo 
      ? `/verify?email=${encodeURIComponent(email)}&redirect=${redirectTo}`
      : `/verify?email=${encodeURIComponent(email)}`
    
    router.push(verifyUrl)
    setLoading(false)
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-muted-foreground mt-1">Unlock Your Meta-experience</p>
        <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
          Demo: Use any email and password
        </p>
      </div>

      <OAuthButtons mode="signup" />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or Continue with email
          </span>
        </div>
      </div>

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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating Account..." : "Submit"}
        </Button>
      </form>

      <p className="text-center text-sm mt-6">
        Already have an account?{" "}
        <Link 
          href={redirectTo ? `/login?redirect=${redirectTo}` : "/login"} 
          className="font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}