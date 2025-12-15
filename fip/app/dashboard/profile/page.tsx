"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { User, Wallet } from "lucide-react"

export default function ProfilePage() {
  const [walletConnected, setWalletConnected] = useState(false)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardContent className="p-8">
          {/* Display Name & Profile Picture */}
          <div className="flex items-start justify-between gap-8">
            <div className="flex-1">
              <Label htmlFor="displayName" className="text-sm font-medium">
                Display Name*
              </Label>
              <Input id="displayName" placeholder="Enter your display name" className="mt-2" />
            </div>
            <div className="text-center">
              <Label className="text-sm font-medium">Profile Picture</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <Button variant="outline" size="sm">
                  Upload Image
                </Button>
              </div>
            </div>
          </div>

          {/* Connect Wallet */}
          <div className="mt-8">
            <Label className="text-sm font-medium">Connect Wallet*</Label>
            <div className="mt-2 flex items-center justify-between border rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {walletConnected ? "0x1gfe45.......760" : "0x1gfe45.......760"}
                </span>
              </div>
              <Button variant="default" size="sm" onClick={() => setWalletConnected(true)}>
                Connect Wallet
              </Button>
            </div>
          </div>

          {/* Links & Social Media */}
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Links & Social Media</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dappUrl" className="text-sm font-medium">
                  DApp URL
                </Label>
                <Input id="dappUrl" placeholder="https://metaguage.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="github" className="text-sm font-medium">
                  GitHub(if open source
                </Label>
                <Input id="github" placeholder="http://metaguage.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="twitter" className="text-sm font-medium">
                  Twitter
                </Label>
                <Input id="twitter" placeholder="http://metaguage.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="discord" className="text-sm font-medium">
                  Discord
                </Label>
                <Input id="discord" placeholder="http://metaguage.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="telegram" className="text-sm font-medium">
                  Telegram
                </Label>
                <Input id="telegram" placeholder="http://metaguage.com" className="mt-2" />
              </div>
              <div>
                <Label htmlFor="otherLinks" className="text-sm font-medium">
                  Other Links
                </Label>
                <Input id="otherLinks" placeholder="http://metaguage.com" className="mt-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
