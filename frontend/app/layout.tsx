import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })

import { AuthProvider } from "@/components/auth/auth-provider"

export const metadata: Metadata = {
  title: "MetaGauge - Measure, Optimize, and Scale Your Web3 Project",
  description: "Track feature adoption, wallet behavior, and financial health across Ethereum, Polygon, and Starknet",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
