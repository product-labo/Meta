import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function CTASection() {
  return (
    <section className="px-6 py-16 md:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {/* Left dashboard image */}
            <div className="hidden md:block w-72 h-44 relative rounded-xl overflow-hidden shadow-2xl opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/images/dashboard-left.png"
                alt="Dashboard Analytics"
                width={288}
                height={176}
                className="object-cover w-full h-full"
              />
            </div>

            {/* Center content */}
            <div className="text-center py-8 px-4">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Ready to see full Details</h2>
              <p className="text-muted-foreground mb-6">Sign up unlock full access</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>

            {/* Right dashboard image */}
            <div className="hidden md:block w-72 h-44 relative rounded-xl overflow-hidden shadow-2xl opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/images/dashboard-right.png"
                alt="Network Analytics"
                width={288}
                height={176}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
