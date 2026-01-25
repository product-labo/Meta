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
import { Mail, EyeOff, Eye, Loader2, User } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-provider"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const redirectTo = searchParams.get('redirect')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    
    if (!name || !email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Use real API registration
      const result = await api.auth.register({ name, email, password })
      
      // Auto-login after successful registration
      login(result.token, result.user)

      // Redirect to analyzer or default page
      if (redirectTo === 'analyzer') {
        router.push("/analyzer")
      } else {
        router.push("/analyzer")
      }
      
    } catch (error: any) {
      console.error('Registration error:', error)
      setError(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Sign Up</h1>
        <p className="text-muted-foreground mt-1">Unlock Your Meta-experience</p>
        {/* {process.env.NODE_ENV === 'development' && (
          <p className="text-sm text-blue-600 mt-2 bg-blue-50 p-2 rounded">
            Create your account to access the analytics dashboard
          </p>
        )} */}
      </div>

      {/* <OAuthButtons mode="signup" /> */}

      {/* <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or Continue with email
          </span>
        </div>
      </div> */}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pr-10"
              disabled={loading}
            />
            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

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
              disabled={loading}
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
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Password must be at least 6 characters
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
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