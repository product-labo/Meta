"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DashboardHeader } from "@/components/dashboard/header"
import { Share, Upload, Wallet, Twitter, Github, MessageSquare, Send, Globe, Link2, Eye, EyeOff, LogOut, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"

export default function ResearcherSettingsPage() {
  const { logout } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)

  return (
    <div className="p-8 space-y-8 bg-[#F9FAFB] min-h-screen">
      <DashboardHeader
        title="Profile & Settings"
        subtitle="Manage your Account, API Keys and application preference"
        action={
          <Button className="h-10 px-4 rounded-xl bg-[#111827] text-white text-xs font-bold hover:bg-gray-800 transition-colors">
            <Share className="w-4 h-4 mr-2" /> Share/Export
          </Button>
        }
      />

      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Profile Information */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
          <h2 className="text-lg font-bold text-[#111827]">Profile Information</h2>

          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Profile Picture</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 bg-gray-100">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gray-100 text-gray-400">
                    <Upload className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <Button className="bg-[#111827] text-white rounded-xl px-6 h-11 text-xs font-bold hover:bg-gray-800 transition-colors">
                  Upload Image
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Label htmlFor="display-name" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Display Name*</Label>
              <Input
                id="display-name"
                placeholder="Enter your display name"
                className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm focus:ring-1 focus:ring-gray-300 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Connect Wallet*</Label>
            <div className="flex items-center justify-between p-3 pl-5 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-400">0x1gfe45.......760</span>
              </div>
              <Button className="bg-[#111827] text-white rounded-xl px-6 h-10 text-xs font-bold hover:bg-gray-800 transition-colors">
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>

        {/* Links & Social Media */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
          <h2 className="text-lg font-bold text-[#111827]">Links & Social Media</h2>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-3">
              <Label htmlFor="research-url" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Research Website / Portfolio</Label>
              <Input id="research-url" placeholder="https://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="github" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">GitHub</Label>
              <Input id="github" placeholder="http://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="twitter" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Twitter</Label>
              <Input id="twitter" placeholder="http://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="discord" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Discord</Label>
              <Input id="discord" placeholder="http://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="telegram" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Telegram</Label>
              <Input id="telegram" placeholder="http://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="other" className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Other Links</Label>
              <Input id="other" placeholder="http://metaguage.com" className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-12">
          <h2 className="text-lg font-bold text-[#111827]">Security</h2>

          <div className="flex items-center justify-between pb-8 border-b border-gray-100">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111827]">Two-Factor Authentication</h3>
              <p className="text-xs text-gray-400 font-medium">Add an extra layer of security to your account</p>
            </div>
            <Switch
              checked={is2FAEnabled}
              onCheckedChange={setIs2FAEnabled}
              className="data-[state=checked]:bg-[#111827]"
            />
          </div>

          <div className="space-y-8">
            <h3 className="text-sm font-bold text-[#111827]">Change password</h3>

            <div className="space-y-6">
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Current Password"
                  className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm"
                />
              </div>

              <div className="flex gap-6 items-end">
                <div className="flex-1 space-y-3">
                  <Input
                    type="password"
                    placeholder="New Password"
                    className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    className="h-12 bg-white border-gray-200 rounded-xl px-4 text-sm"
                  />
                </div>
                <Button className="bg-[#111827] text-white rounded-xl px-8 h-12 text-sm font-bold hover:bg-gray-800 transition-colors whitespace-nowrap">
                  Update Password
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-3xl border border-red-100 p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-500">Danger Zone</h2>
          </div>

          <div className="flex items-center justify-between p-6 bg-red-50/50 border border-red-100 rounded-2xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#111827]">Sign out</h3>
              <p className="text-xs text-gray-500 font-medium">Securely log out of your account on this device.</p>
            </div>
            <Button
              onClick={logout}
              variant="destructive"
              className="rounded-xl px-8 h-12 text-sm font-bold gap-2"
            >
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
