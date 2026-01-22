"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const storedState = sessionStorage.getItem('oauth_state')

        if (!code) {
          throw new Error('Authorization code not received')
        }

        if (state !== storedState) {
          throw new Error('Invalid state parameter')
        }

        // Exchange code for user info
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        if (!response.ok) {
          throw new Error('Failed to authenticate with Google')
        }

        const data = await response.json()
        
        // Use the social login API
        const loginResponse = await api.auth.socialLogin({
          email: data.email,
          name: data.name,
          avatar: data.picture,
          provider: 'google',
          providerId: data.sub
        })

        // Update auth state
        login(loginResponse.token, loginResponse.user)

        setStatus('success')
        setMessage('Successfully signed in with Google!')

        // Clean up
        sessionStorage.removeItem('oauth_state')

        // Redirect based on user state
        const user = loginResponse.user
        if (!user.is_verified) {
          router.push(`/verify?email=${encodeURIComponent(user.email)}`)
        } else if (!user.onboarding_completed) {
          router.push('/onboarding/role')
        } else if (user.roles?.includes('startup')) {
          router.push('/startup')
        } else {
          router.push('/dashboard')
        }

      } catch (error) {
        console.error('Google OAuth callback error:', error)
        setStatus('error')
        setMessage((error as Error).message || 'Authentication failed')
        
        // Redirect to login after error
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router, login])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Completing Google sign-in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-600 text-2xl mb-4">✓</div>
            <p className="text-green-600">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-600 text-2xl mb-4">✗</div>
            <p className="text-red-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  )
}
