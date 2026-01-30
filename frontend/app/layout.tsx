import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })

import { AuthProvider } from "@/components/auth/auth-provider"
import { ThemeProvider } from "@/components/theme/theme-provider"

export const metadata: Metadata = {
  title: "MetaGauge - Measure, Optimize, and Scale Your Web3 Project",
  description: "Track feature adoption, wallet behavior, and financial health across Ethereum, Polygon, and Starknet",
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/icon-light-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="metagauge-ui-theme"
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
