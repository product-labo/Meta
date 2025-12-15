"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck } from "lucide-react"

import { api } from "@/lib/api"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState(emailParam || "")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const otpString = otp.join("")

    try {
      const res = await api.auth.verifyOTP({ email, otp: otpString })
      // Store token
      localStorage.setItem("token", res.token)
      localStorage.setItem("user", JSON.stringify(res.user))

      router.push("/onboarding/role")
    } catch (err) {
      alert("Verification failed: " + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await api.auth.signup({ email })
      alert("Code resent!")
    } catch (err) {
      alert("Failed to resend: " + (err as Error).message)
    }
  }

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split("").forEach((char, index) => {
      if (index < 6) newOtp[index] = char
    })
    setOtp(newOtp)
  }

  return (
    <AuthCard>
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Verify Verification Code</h1>
        <p className="text-muted-foreground mt-1">
          We've sent a code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-center"
          />
        </div>

        <div className="space-y-2">
          <Label className="sr-only">Verification Code</Label>
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                name={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2"
                value={digit} // Use digit mapped from otp
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
          <span>Didn't receive any Code?</span>
          <button type="button" onClick={handleResend} className="font-medium text-foreground hover:underline">
            Resend Code 0:58
          </button>
        </div>

        <Button type="submit" className="w-full mt-6" disabled={loading}>
          {loading ? "Verifying..." : "Verify"}
        </Button>
      </form>
    </AuthCard>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  )
}
