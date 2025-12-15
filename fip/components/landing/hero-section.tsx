import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowUpRight } from "lucide-react"
import Image from "next/image"

export function HeroSection() {
  return (
    <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
          Meta Gauge: Measure,{" "}
          <span className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-2xl md:text-4xl">
            Optimize
            <ArrowUpRight className="h-5 w-5 md:h-7 md:w-7" />
          </span>{" "}
          and Scale Your Web3 Project
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mt-6">
          Track feature adoption, wallet behavior, and financial health across Ethereum, Polygon, and Starknet
        </p>
        <Link href="/explore">
          <Button className="mt-8 gap-2" size="lg">
            Explore Project
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="relative mt-12">
        <div className="bg-gradient-to-b from-muted/50 to-background rounded-2xl p-4 shadow-xl border">
          <Image
            src="/images/home-20page.png"
            alt="MetaGauge Dashboard Preview"
            width={1200}
            height={600}
            className="rounded-xl w-full object-cover object-top"
            style={{ maxHeight: "500px" }}
          />
        </div>
      </div>
    </section>
  )
}
