import Link from "next/link"
import { MetaGaugeLogo } from "@/components/icons/metagauge-logo"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2">
        <MetaGaugeLogo className="h-6 w-8" />
        <span className="font-semibold text-lg">MetaGauge</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        <Link href="/" className="text-sm font-medium hover:text-foreground/80">
          Home
        </Link>
        <Link href="/explore" className="text-sm font-medium hover:text-primary transition-colors">
          Explore
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </header>
  )
}
