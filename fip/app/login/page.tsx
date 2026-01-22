"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:300'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        // Update Global Auth State (persistence handled by provider)
        login(data.token, data.user);

        // Redirection Logic
        const user = data.user;

        // 0. Enforce Verification (Double check)
        if (user.is_verified === false) {
          router.push(`/verify?email=${encodeURIComponent(user.email || email)}`);
          return;
        }

        // 1. Check Onboarding
        if (user.onboarding_completed === false) {
          router.push("/onboarding/role");
          return;
        }

        // 2. Role-based Redirection
        const roles = user.roles || [];
        if (roles.includes('startup')) {
          router.push("/startup");
        } else {
          // Default to researcher dashboard
          router.push("/dashboard");
        }
      } else {
        if (res.status === 403 && data.requiresVerification) {
          // Redirect to verify page
          // Store email in local storage or query param to pre-fill
          // Simple approach: query param
          router.push(`/verify?email=${encodeURIComponent(data.email)}`);
        } else {
          alert(data.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login');
    }
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-muted-foreground mt-1">Welcome back to MetaGauge</p>
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
