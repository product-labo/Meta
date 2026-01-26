import Link from "next/link"
import { MetaGaugeLogo } from "@/components/icons/metagauge-logo"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { User, LogOut, BarChart3, History, MessageCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2">
        <MetaGaugeLogo className="h-6 w-8" />
        <span className="font-semibold text-lg">MetaGauge</span>
      </Link>

      {isAuthenticated && (
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/analyzer" className="text-sm font-medium hover:text-primary transition-colors">
            Analyzer
          </Link>
          <Link href="/chat" className="text-sm font-medium hover:text-primary transition-colors">
            Chat
          </Link>
          <Link href="/history" className="text-sm font-medium hover:text-primary transition-colors">
            History
          </Link>
        </nav>
      )}

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {user?.email?.split('@')[0] || 'User'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/chat" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Contract Chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Analysis History
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-600">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
