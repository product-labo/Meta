import { DashboardHeader } from "@/components/dashboard/header"
import { ProjectsTable } from "@/components/dashboard/projects-table"

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0">
        <DashboardHeader title="Top Web3 Project" subtitle="Real time analysis across chain" showFilters />
      </div>
      <div className="flex-1 p-6">
        <ProjectsTable />
      </div>
    </div>
  )
}
