import { Header } from "@/components/ui/header"
import { HeroSection } from "@/components/landing/hero-section"
import { RolesSection } from "@/components/landing/roles-section"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-background to-blue-50/30">
      <Header />
      <main>
        <HeroSection />
        <RolesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
