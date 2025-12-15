import { Header } from "@/components/ui/header"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import { DashboardHeader } from "@/components/dashboard/header"

export default function ExplorePage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Explore Web3 Projects</h1>
                    <p className="text-muted-foreground mt-2">Discover real-time analysis and metrics across top chains</p>
                </div>
                <ProjectsTable />
            </main>
        </div>
    )
}
