"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, Shield, AlertTriangle } from "lucide-react"

export default function SettingsPage() {
    const { user, logout } = useAuth()

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <DashboardSidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-8">Settings</h1>

                <div className="max-w-4xl space-y-8">
                    {/* Profile Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" /> Profile Settings
                            </CardTitle>
                            <CardDescription>Manage your public profile and personal details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user?.avatar || ""} />
                                    <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <h3 className="font-medium">Profile Picture</h3>
                                    <p className="text-sm text-muted-foreground">JPG, GIF or PNG. Max size of 800K</p>
                                    <Button variant="outline" size="sm">Upload new photo</Button>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Account Role</Label>
                                    <Input id="role" value={user?.roles?.[0] || "User"} disabled className="bg-muted capitalize" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Section (Mock) */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" /> Security
                            </CardTitle>
                            <CardDescription>Update your password and security settings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline">Change Password</Button>
                        </CardContent>
                    </Card>

                    {/* Danger Zone / Logout */}
                    <Card className="border-destructive/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" /> Danger Zone
                            </CardTitle>
                            <CardDescription>Destructive actions for your account</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium">Sign out</h4>
                                    <p className="text-sm text-muted-foreground">Securely log out of your account on this device.</p>
                                </div>
                                <Button variant="destructive" onClick={logout} className="gap-2">
                                    <LogOut className="h-4 w-4" /> Log out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
